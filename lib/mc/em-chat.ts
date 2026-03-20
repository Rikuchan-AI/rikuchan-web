import type { Project, Task, TaskPriority } from "./types-project";
import { useProjectsStore } from "./projects-store";
import { startTaskExecution } from "./em-delegation";
import { toast } from "@/components/shared/toast";

export interface EMAction {
  type: "create_task" | "reassign_task" | "update_priority" | "unblock_task";
  [key: string]: unknown;
}

export function buildLeadSystemPrompt(project: Project, tasks: Task[]): string {
  const activeTasks = tasks.filter((t) => t.status === "progress");
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const roster = project.roster ?? [];
  const lead = roster.find((m) => m.role === "lead");

  return `You are ${lead?.agentName ?? "the Lead Agent"} for project "${project.name}".

PROJECT STATE:
- Workspace: ${project.workspacePath || "(not configured)"}
- Active tasks (${activeTasks.length}): ${activeTasks.map((t) => `"${t.title}" → ${t.assignedAgentName ?? "unassigned"}`).join(", ") || "none"}
- Blocked tasks (${blockedTasks.length}): ${blockedTasks.map((t) => `"${t.title}"`).join(", ") || "none"}
- Total tasks: ${tasks.length}

ROSTER (${roster.length} agents):
${roster.map((m) => `- ${m.agentName} (${m.role})`).join("\n")}

You can:
- Create new tasks on the board
- Reassign tasks between agents
- Reprioritize tasks
- Unblock tasks
- Summarize project status
- Give directives to specific agents

When you decide to take an action, respond with your explanation AND include a JSON action block:

\`\`\`action
{ "type": "create_task", "title": "...", "description": "...", "priority": "medium", "assignTo": "agentId" }
\`\`\`

or

\`\`\`action
{ "type": "reassign_task", "taskId": "...", "agentId": "..." }
\`\`\`

Always explain your reasoning before the action block.`;
}

export function parseLeadActions(response: string): EMAction[] {
  const actionRegex = /```action\n([\s\S]*?)```/g;
  const actions: EMAction[] = [];
  let match;
  while ((match = actionRegex.exec(response)) !== null) {
    try {
      actions.push(JSON.parse(match[1]));
    } catch {
      console.warn("[LeadChat] Failed to parse action:", match[1]);
    }
  }
  return actions;
}

export function stripActionBlocks(response: string): string {
  return response.replace(/```action\n[\s\S]*?```/g, "").trim();
}

/**
 * Execute actions parsed from the Lead agent's response.
 * Creates tasks, reassigns, updates priority, unblocks — all via the projects store.
 */
export function executeLeadActions(actions: EMAction[], projectId: string): string[] {
  const store = useProjectsStore.getState();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return [];

  const results: string[] = [];

  for (const action of actions) {
    switch (action.type) {
      case "create_task": {
        const now = Date.now();
        const title = String(action.title ?? "Untitled task");
        const description = String(action.description ?? "");
        const priority = (action.priority as TaskPriority) ?? "medium";
        const assignTo = action.assignTo as string | undefined;
        const assignAgent = assignTo ? project.roster.find((m) => m.agentId === assignTo) : undefined;

        const task: Task = {
          id: `task-${now}-${Math.random().toString(16).slice(2, 6)}`,
          projectId,
          title,
          description,
          status: assignAgent ? "progress" : "backlog",
          priority,
          assignedAgentId: assignAgent?.agentId ?? null,
          assignedAgentName: assignAgent?.agentName,
          createdBy: "lead-agent",
          subtasks: [],
          createdAt: now,
          updatedAt: now,
          tags: [],
          attachments: [],
          delegationStatus: assignAgent ? "delegated" : "idle",
          startedAt: assignAgent ? now : undefined,
        };

        store.createTask(projectId, task);

        // Auto-execute if assigned
        if (assignAgent) {
          startTaskExecution(task, assignAgent, project);
        }

        results.push(`Created: "${title}"${assignAgent ? ` → ${assignAgent.agentName}` : ""}`);
        toast("success", `Lead created task: "${title}"`);
        break;
      }

      case "reassign_task": {
        const taskId = String(action.taskId ?? "");
        const agentId = String(action.agentId ?? "");
        const agent = project.roster.find((m) => m.agentId === agentId);
        const tasks = store.tasks[projectId] ?? [];
        const task = tasks.find((t) => t.id === taskId);

        if (task && agent) {
          store.updateTask(projectId, taskId, {
            assignedAgentId: agentId,
            assignedAgentName: agent.agentName,
            status: "progress",
            startedAt: Date.now(),
            updatedAt: Date.now(),
            delegationStatus: "delegated",
          });
          startTaskExecution(task, agent, project);
          results.push(`Reassigned: "${task.title}" → ${agent.agentName}`);
          toast("success", `Lead reassigned "${task.title}" to ${agent.agentName}`);
        }
        break;
      }

      case "update_priority": {
        const taskId = String(action.taskId ?? "");
        const priority = action.priority as TaskPriority;
        const tasks = store.tasks[projectId] ?? [];
        const task = tasks.find((t) => t.id === taskId);

        if (task && priority) {
          store.updateTask(projectId, taskId, { priority, updatedAt: Date.now() });
          results.push(`Priority: "${task.title}" → ${priority}`);
        }
        break;
      }

      case "unblock_task": {
        const taskId = String(action.taskId ?? "");
        const tasks = store.tasks[projectId] ?? [];
        const task = tasks.find((t) => t.id === taskId);

        if (task) {
          store.updateTask(projectId, taskId, { status: "progress", updatedAt: Date.now() });
          results.push(`Unblocked: "${task.title}"`);

          // Re-execute if agent assigned
          const agent = project.roster.find((m) => m.agentId === task.assignedAgentId);
          if (agent) {
            startTaskExecution(task, agent, project);
          }
        }
        break;
      }
    }
  }

  return results;
}
