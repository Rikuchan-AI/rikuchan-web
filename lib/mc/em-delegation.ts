import { useGatewayStore, registerExternalRpcResponseId, unregisterExternalRpcResponseId } from "./gateway-store";
import { useProjectsStore } from "./projects-store";
import { buildAgentSessionKey } from "./session-routing";
import type { Task, Project, RosterMember, ExecutionMessage } from "./types-project";

interface EMDecision {
  assignedAgentId: string;
  assignedAgentName: string;
  reason: string;
}

/**
 * Trigger the Lead Board Agent (EM) to decide who should execute a task.
 * Updates the task in the store with delegation status and provides real-time feedback.
 */
export async function triggerEMDelegation(task: Task, project: Project): Promise<EMDecision | null> {
  const store = useProjectsStore.getState();
  const gwStore = useGatewayStore.getState();

  // Mark task as delegating
  store.updateTask(project.id, task.id, { delegationStatus: "delegating" });

  const roster = project.roster.filter((m) => m.role !== "lead");

  // Check which agents are online
  const onlineStatuses = new Set(["online", "idle", "thinking"]);
  const isAgentOnline = (agentId: string): boolean => {
    const agent = gwStore.agents.find((a) => a.id === agentId);
    return agent ? onlineStatuses.has(agent.status) : false;
  };

  // If no non-lead agents, try to assign to the lead itself (solo project)
  if (roster.length === 0) {
    const leadOnly = project.roster.find((m) => m.role === "lead");
    if (!leadOnly) {
      store.updateTask(project.id, task.id, { delegationStatus: "em-unavailable" });
      return null;
    }
    if (!isAgentOnline(leadOnly.agentId)) {
      store.updateTask(project.id, task.id, {
        delegationStatus: "em-unavailable",
        assignedAgentId: leadOnly.agentId,
        assignedAgentName: leadOnly.agentName,
        emDecisionReason: "Lead agent is offline — task queued for when agent comes online",
      });
      return null;
    }
    const decision: EMDecision = {
      assignedAgentId: leadOnly.agentId,
      assignedAgentName: leadOnly.agentName,
      reason: "Only agent in roster (lead executes directly)",
    };
    applyDelegation(project.id, task.id, decision);
    startTaskExecution(task, leadOnly, project);
    return decision;
  }

  // If only one non-lead agent, assign directly (but check online status)
  if (roster.length === 1) {
    const agent = roster[0];
    if (!isAgentOnline(agent.agentId)) {
      store.updateTask(project.id, task.id, {
        assignedAgentId: agent.agentId,
        assignedAgentName: agent.agentName,
        emDecisionReason: `${agent.agentName} is offline — task will execute when agent comes online`,
        delegationStatus: "delegated",
      });
      return {
        assignedAgentId: agent.agentId,
        assignedAgentName: agent.agentName,
        reason: `${agent.agentName} is offline — task queued`,
      };
    }
    const decision: EMDecision = {
      assignedAgentId: agent.agentId,
      assignedAgentName: agent.agentName,
      reason: "Only available agent in roster",
    };
    applyDelegation(project.id, task.id, decision);
    startTaskExecution(task, agent, project);
    return decision;
  }

  // Find lead agent
  const leadAgent = project.roster.find((m) => m.role === "lead");
  if (!leadAgent || !gwStore._ws || gwStore._ws.readyState !== WebSocket.OPEN) {
    store.updateTask(project.id, task.id, { delegationStatus: "em-unavailable" });
    return null;
  }

  const prompt = buildLeadPrompt(task, project, roster, leadAgent.agentName);

  try {
    const decision = await requestEMDecision(leadAgent.agentId, prompt, roster, project.id, task.id);
    if (decision) {
      applyDelegation(project.id, task.id, decision);
      // Start execution for the assigned agent
      const assignedMember = roster.find((m) => m.agentId === decision.assignedAgentId);
      if (assignedMember) {
        startTaskExecution(task, assignedMember, project);
      }
      return decision;
    }
  } catch (err) {
    console.error("[Lead] Delegation failed:", err);
  }

  store.updateTask(project.id, task.id, { delegationStatus: "em-unavailable" });
  return null;
}

function buildLeadPrompt(task: Task, project: Project, roster: RosterMember[], leadName: string): string {
  return `You are ${leadName}, the Lead Agent for project "${project.name}".

A new task was created and needs to be assigned to the most suitable agent.

TASK:
- Title: ${task.title}
- Description: ${task.description}
- Priority: ${task.priority}

AVAILABLE AGENTS IN ROSTER:
${roster.map((m) => `- ${m.agentName} (id: ${m.agentId}, role: ${m.role})`).join("\n")}

Respond with ONLY valid JSON, no other text:
{
  "assignedAgentId": "<agentId from the roster list above>",
  "assignedAgentName": "<name of the chosen agent>",
  "reason": "<one sentence explaining why this agent is the best fit>"
}`;
}

function applyDelegation(projectId: string, taskId: string, decision: EMDecision) {
  useProjectsStore.getState().updateTask(projectId, taskId, {
    assignedAgentId: decision.assignedAgentId,
    assignedAgentName: decision.assignedAgentName,
    emDecisionReason: decision.reason,
    emDelegatedAt: Date.now(),
    delegationStatus: "delegated",
    status: "progress",
    startedAt: Date.now(),
  });
}

function requestEMDecision(
  leadAgentId: string,
  prompt: string,
  roster: RosterMember[],
  projectId: string,
  taskId: string,
): Promise<EMDecision | null> {
  return new Promise((resolve) => {
    const ws = useGatewayStore.getState()._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve(null);
      return;
    }

    const reqId = `em-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const idempotencyKey = `em-delegate-${taskId}`;
    const project = useProjectsStore.getState().projects.find((p) => p.id === projectId);
    const group = project?.groupId
      ? useProjectsStore.getState().groups.find((g) => g.id === project.groupId)
      : undefined;
    const sessionKey = project
      ? buildAgentSessionKey(leadAgentId, project, group?.agentId)
      : `agent:${leadAgentId}:main`;

    let responseText = "";
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.removeEventListener("message", handler);
        console.warn("[Lead] Delegation timed out after 15s");
        resolve(null);
      }
    }, 15_000);

    const handler = (event: MessageEvent) => {
      if (resolved) return;
      try {
        const msg = JSON.parse(event.data);

        // Collect assistant text from agent stream events
        if (msg.type === "event" && msg.event === "agent") {
          const payload = msg.payload as {
            stream?: string;
            sessionKey?: string;
            data?: { text?: string; delta?: string; phase?: string };
          };

          // Only capture messages for our session
          if (payload.sessionKey && payload.sessionKey !== sessionKey) return;

          if (payload.stream === "assistant" && payload.data) {
            const delta = payload.data.delta ?? payload.data.text ?? "";
            responseText += delta;

            // Add to execution log for visibility
            if (delta.trim()) {
              const log: ExecutionMessage = {
                role: "assistant",
                content: delta,
                timestamp: Date.now(),
              };
              const task = useProjectsStore.getState().tasks[projectId]?.find((t) => t.id === taskId);
              if (task) {
                useProjectsStore.getState().updateTask(projectId, taskId, {
                  executionLog: [...(task.executionLog ?? []), log],
                });
              }
            }
          }

          // Check for lifecycle end — agent finished
          if (payload.stream === "lifecycle" && payload.data?.phase === "end") {
            resolved = true;
            clearTimeout(timeout);
            ws.removeEventListener("message", handler);
            const decision = parseEMResponse(responseText, roster);
            resolve(decision);
          }
        }

        // Handle RPC response (chat.send returns immediately, agent runs async)
        if (msg.type === "res" && msg.id === reqId) {
          if (!msg.ok) {
            const err = msg.error as { message?: string } | undefined;
            console.error("[Lead] chat.send failed:", err?.message);
            resolved = true;
            clearTimeout(timeout);
            ws.removeEventListener("message", handler);
            resolve(null);
          }
          // If ok, wait for agent events to complete
        }
      } catch { /* ignore parse errors */ }
    };

    ws.addEventListener("message", handler);

    // Send chat.send with correct sessionKey format
    ws.send(JSON.stringify({
      type: "req",
      id: reqId,
      method: "chat.send",
      params: {
        sessionKey,
        message: prompt,
        idempotencyKey,
      },
    }));

    console.log("[Lead] Sent delegation request to", leadAgentId, "session:", sessionKey);

    // Add initial log entry
    useProjectsStore.getState().updateTask(projectId, taskId, {
      executionLog: [{
        role: "user",
        content: `Requesting EM delegation for: ${useProjectsStore.getState().tasks[projectId]?.find((t) => t.id === taskId)?.title ?? taskId}`,
        timestamp: Date.now(),
      }],
    });
  });
}

function parseEMResponse(text: string, roster: RosterMember[]): EMDecision | null {
  try {
    // Find JSON in the response text
    const jsonMatch = text.match(/\{[\s\S]*?"assignedAgentId"[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn("[Lead] No JSON found in response:", text.slice(0, 200));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as EMDecision;
    // Validate the assigned agent exists in roster
    if (!roster.some((m) => m.agentId === parsed.assignedAgentId)) {
      console.warn("[Lead] Assigned agent not in roster:", parsed.assignedAgentId);
      return null;
    }
    if (!parsed.reason) return null;

    return parsed;
  } catch (err) {
    console.warn("[Lead] Failed to parse response:", err);
    return null;
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [3_000, 8_000, 15_000]; // 3s, 8s, 15s

/**
 * Start a task execution session for a specific agent.
 * Retries automatically on failure with backoff.
 */
export function startTaskExecution(
  task: Task,
  agent: RosterMember,
  project: Project,
  attempt = 0,
): void {
  const gwStore = useGatewayStore.getState();
  const ws = gwStore._ws;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] ?? 15_000;
      console.warn(`[Task] Gateway not connected, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      appendTaskLog(project.id, task.id, "system", `Gateway not connected. Retrying in ${delay / 1000}s... (${attempt + 1}/${MAX_RETRIES})`);
      setTimeout(() => startTaskExecution(task, agent, project, attempt + 1), delay);
    } else {
      console.error("[Task] Failed to start execution after", MAX_RETRIES, "attempts");
      appendTaskLog(project.id, task.id, "system", `Failed to start after ${MAX_RETRIES} retries. Use "Start Execution Now" to retry manually.`);
      useProjectsStore.getState().updateTask(project.id, task.id, {
        delegationStatus: "em-unavailable",
      });
    }
    return;
  }

  const reqId = `exec-${task.id}-${Date.now()}-${attempt}`;
  registerExternalRpcResponseId(reqId);
  const execGroup = project.groupId
    ? useProjectsStore.getState().groups.find((g) => g.id === project.groupId)
    : undefined;
  const sessionKey = buildAgentSessionKey(agent.agentId, project, execGroup?.agentId);
  const idempotencyKey = `task-exec-${task.id}`;

  const workspace = project.workspacePath || "(not configured — check project settings)";
  const filesSection = task.attachments && task.attachments.length > 0
    ? `\n\nRelevant files:\n${task.attachments.map((a) => `- ${a.path}${a.label ? ` (${a.label})` : ""}`).join("\n")}`
    : "";

  // Include context files inline (from uploads/ZIPs)
  const contextParts: string[] = [];
  if (task.contextNote) {
    contextParts.push(`Context note:\n${task.contextNote}`);
  }
  if (task.contextFiles && task.contextFiles.length > 0) {
    for (const cf of task.contextFiles) {
      const truncated = cf.content.length > 8000 ? cf.content.slice(0, 8000) + "\n... (truncated)" : cf.content;
      contextParts.push(`--- ${cf.name} ---\n${truncated}`);
    }
  }
  const contextSection = contextParts.length > 0
    ? `\n\nContext provided by the user:\n${contextParts.join("\n\n")}`
    : "";

  const prompt = `You are ${agent.agentName} (${agent.role}) in project "${project.name}".

Execute this task:
- Title: ${task.title}
- Description: ${task.description}
- Priority: ${task.priority}
- Workspace: ${workspace}${filesSection}${contextSection}

Start working on it now. Report progress as you go.
If you cannot complete the task due to missing data or access issues, respond with BLOCKED: followed by the reason.`;

  console.log(`[Task] Sending chat.send for "${task.title}" via ${agent.agentName} (attempt ${attempt + 1})`);

  // Listen for the response to detect failure
  const timeout = setTimeout(() => {
    ws.removeEventListener("message", handler);
    unregisterExternalRpcResponseId(reqId);
    // No response in 10s — retry
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAYS[attempt] ?? 15_000;
      console.warn(`[Task] chat.send timed out, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      appendTaskLog(project.id, task.id, "system", `Request timed out. Retrying in ${delay / 1000}s... (${attempt + 1}/${MAX_RETRIES})`);
      setTimeout(() => startTaskExecution(task, agent, project, attempt + 1), delay);
    }
  }, 10_000);

  const handler = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "res" && msg.id === reqId) {
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);
        unregisterExternalRpcResponseId(reqId);

        if (msg.ok) {
          const payload = msg.payload as { runId?: string; sessionKey?: string } | undefined;
          const actualSessionKey = payload?.sessionKey ?? sessionKey;
          const runId = payload?.runId;
          console.log("[Task] Execution started for", task.title, "via", agent.agentName, "runId:", runId, "sessionKey:", actualSessionKey);
          // Update sessionId with the actual key from gateway (may differ from constructed one)
          if (actualSessionKey !== sessionKey || runId) {
            useProjectsStore.getState().updateTask(project.id, task.id, {
              sessionId: actualSessionKey,
            });
          }
        } else {
          const err = msg.error as { message?: string; retryAfterMs?: number } | undefined;
          console.warn("[Task] chat.send failed:", err?.message);

          if (attempt < MAX_RETRIES) {
            const delay = err?.retryAfterMs ?? RETRY_DELAYS[attempt] ?? 15_000;
            appendTaskLog(project.id, task.id, "system", `Execution failed: ${err?.message ?? "unknown error"}. Retrying in ${delay / 1000}s... (${attempt + 1}/${MAX_RETRIES})`);
            setTimeout(() => startTaskExecution(task, agent, project, attempt + 1), delay);
          } else {
            appendTaskLog(project.id, task.id, "system", `Execution failed after ${MAX_RETRIES} retries: ${err?.message ?? "unknown error"}`);
            useProjectsStore.getState().updateTask(project.id, task.id, {
              delegationStatus: "em-unavailable",
            });
          }
        }
      }
    } catch { /* ignore */ }
  };

  ws.addEventListener("message", handler);

  ws.send(JSON.stringify({
    type: "req",
    id: reqId,
    method: "chat.send",
    params: {
      sessionKey,
      message: prompt,
      idempotencyKey,
    },
  }));

  // Update task with session tracking (only on first attempt)
  if (attempt === 0) {
    // Preserve existing startedAt if task was already started
    const existingTask = useProjectsStore.getState().tasks[project.id]?.find((t) => t.id === task.id);
    const startedAt = existingTask?.startedAt ?? task.startedAt ?? Date.now();

    useProjectsStore.getState().updateTask(project.id, task.id, {
      sessionId: sessionKey,
      startedAt,
      status: "progress",
      delegationStatus: "delegated",
      executionLog: existingTask?.executionLog?.some((m) => m.role === "assistant") ? existingTask.executionLog : [{
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      }],
    });
  }

  console.log(`[Task] Sending chat.send for "${task.title}" via ${agent.agentName} (attempt ${attempt + 1})`);
}

/** Append a message to a task's execution log */
function appendTaskLog(projectId: string, taskId: string, role: "system" | "assistant" | "tool", content: string) {
  const store = useProjectsStore.getState();
  const tasks = store.tasks[projectId];
  if (!tasks) return;
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  store.updateTask(projectId, taskId, {
    executionLog: [...(task.executionLog ?? []), { role, content, timestamp: Date.now() }],
  });
}
