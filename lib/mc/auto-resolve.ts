/**
 * Autonomous block resolution system.
 *
 * When a task is blocked, the Lead agent is automatically asked to resolve it.
 * Resolution strategies (in order):
 * 1. Reassign to a different agent with different capabilities
 * 2. Create a sub-task to fetch/generate the missing data
 * 3. Retry with additional context
 * 4. Escalate to user (only if all above fail)
 */

import { useGatewayStore } from "./gateway-store";
import { useProjectsStore } from "./projects-store";
import { triggerEMDelegation, startTaskExecution } from "./em-delegation";
import type { Task, Project, RosterMember } from "./types-project";

const MAX_AUTO_RESOLVE_ATTEMPTS = 2;
const RESOLVE_COOLDOWN_MS = 30_000; // Don't retry resolution within 30s

// Track resolution attempts per task to avoid infinite loops
const resolveAttempts = new Map<string, { count: number; lastAttemptAt: number }>();

/**
 * Called when a task transitions to "blocked" status.
 * Automatically tries to resolve via the Lead agent.
 */
export async function handleTaskBlocked(taskId: string, projectId: string): Promise<void> {
  const store = useProjectsStore.getState();
  const tasks = store.tasks[projectId] ?? [];
  const task = tasks.find((t) => t.id === taskId);
  const project = store.projects.find((p) => p.id === projectId);

  if (!task || !project) return;

  // Check cooldown and max attempts
  const attempts = resolveAttempts.get(taskId) ?? { count: 0, lastAttemptAt: 0 };
  const now = Date.now();

  if (attempts.count >= MAX_AUTO_RESOLVE_ATTEMPTS) {
    console.log(`[AutoResolve] Max attempts reached for "${task.title}" — escalating to user`);
    escalateToUser(task, project);
    return;
  }

  if (now - attempts.lastAttemptAt < RESOLVE_COOLDOWN_MS) {
    console.log(`[AutoResolve] Cooldown active for "${task.title}" — waiting`);
    return;
  }

  // Update attempts
  resolveAttempts.set(taskId, { count: attempts.count + 1, lastAttemptAt: now });

  const lead = project.roster.find((m) => m.role === "lead");
  if (!lead) {
    console.log("[AutoResolve] No lead agent — escalating to user");
    escalateToUser(task, project);
    return;
  }

  const ws = useGatewayStore.getState()._ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log("[AutoResolve] Gateway not connected — deferring");
    return;
  }

  console.log(`[AutoResolve] Attempting resolution #${attempts.count + 1} for "${task.title}"`);

  // Extract block reason
  const blockReason = extractBlockReason(task);

  // Strategy 1: Try reassigning to a different agent
  const otherAgents = project.roster.filter(
    (m) => m.role !== "lead" && m.agentId !== task.assignedAgentId
  );

  if (otherAgents.length > 0 && attempts.count === 0) {
    // First attempt: ask Lead to reassign
    const reassignTask: Task = {
      ...task,
      description: `AUTO-RESOLUTION REQUEST:

This task was blocked. Try to resolve it by reassigning to a different agent.

Original task: "${task.title}"
${task.description}

BLOCK REASON: ${blockReason}

Previous agent: ${task.assignedAgentName ?? "unknown"} could not complete it.

Available agents:
${otherAgents.map((m) => `- ${m.agentName} (${m.role}, id: ${m.agentId})`).join("\n")}

Choose the best agent to handle this. Respond with JSON:
{"assignedAgentId": "<id>", "assignedAgentName": "<name>", "reason": "<why>"}`,
    };

    const decision = await triggerEMDelegation(reassignTask, project);
    if (decision) {
      console.log(`[AutoResolve] Lead reassigned to ${decision.assignedAgentName}`);
      // Add system log entry
      store.updateTask(projectId, taskId, {
        executionLog: [
          ...(task.executionLog ?? []),
          { role: "system" as const, content: `Auto-resolved: reassigned to ${decision.assignedAgentName}`, timestamp: Date.now() },
        ],
      });
      return;
    }
  }

  // Strategy 2: Retry with the same agent + more context
  if (attempts.count === 1 && task.assignedAgentId) {
    const agent = project.roster.find((m) => m.agentId === task.assignedAgentId);
    if (agent) {
      console.log(`[AutoResolve] Retrying with ${agent.agentName} + additional context`);

      store.updateTask(projectId, taskId, {
        status: "progress",
        executionLog: [
          ...(task.executionLog ?? []),
          { role: "system" as const, content: "Auto-resolve: retrying with additional context", timestamp: Date.now() },
        ],
        updatedAt: Date.now(),
      });

      const retryTask: Task = {
        ...task,
        status: "progress",
        description: `${task.description}

---
RETRY INSTRUCTION: The previous attempt was blocked because: ${blockReason}
Try a different approach. If you need specific files, list them. If you need exec access, use available tools creatively.
If you still cannot proceed, explain EXACTLY what is needed from the user.`,
      };

      startTaskExecution(retryTask, agent, project);
      return;
    }
  }

  // All strategies exhausted — escalate
  escalateToUser(task, project);
}

function extractBlockReason(task: Task): string {
  const assistantText = (task.executionLog ?? [])
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n");

  const blockedMatch = assistantText.match(/BLOCKED:\s*(.+?)(?:\n|$)/);
  if (blockedMatch) return blockedMatch[1].trim();

  const missingMatch = assistantText.match(/Missing Data[^\n]*\n\n([\s\S]*?)(?:\n\n|$)/);
  if (missingMatch) return missingMatch[1].trim();

  return "Agent reported an issue preventing completion";
}

function escalateToUser(task: Task, project: Project): void {
  const store = useProjectsStore.getState();

  store.updateTask(project.id, task.id, {
    executionLog: [
      ...(task.executionLog ?? []),
      {
        role: "system" as const,
        content: `Escalated to user — auto-resolution failed after ${MAX_AUTO_RESOLVE_ATTEMPTS} attempts. Manual intervention required.`,
        timestamp: Date.now(),
      },
    ],
    updatedAt: Date.now(),
  });

  console.log(`[AutoResolve] Escalated "${task.title}" to user`);
}

/** Reset attempts for a task (e.g., when user manually intervenes) */
export function resetResolveAttempts(taskId: string): void {
  resolveAttempts.delete(taskId);
}
