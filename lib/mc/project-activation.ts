"use client";

import { useGatewayStore, registerExternalRpcResponseId, unregisterExternalRpcResponseId } from "./gateway-store";
import { useProjectsStore } from "./projects-store";
import { createAgentViaGateway, setAgentFileViaGateway } from "./agent-files";
import { buildAgentSessionKey } from "./session-routing";
import { syncHeartbeatToGateway } from "./heartbeat-integration";
import type { Project, RosterMember, RosterHeartbeatConfig } from "./types-project";

// Permanent heartbeat config for active board leads — neverSleep: true
// No activeHours = runs 24/7. intervalSeconds matches ROLE_DEFAULT_HEARTBEAT.lead.
const LEAD_ALWAYS_ON_HEARTBEAT: RosterHeartbeatConfig = {
  enabled: true,
  intervalSeconds: 60,
  focus: ["board-review", "agent-health", "task-progress"],
  // no activeHours → no sleep window
};

// Paused state: very long interval so gateway stops sending prompts
const LEAD_PAUSED_HEARTBEAT: RosterHeartbeatConfig = {
  enabled: false,
  intervalSeconds: 86400, // 24h — effectively disabled
  focus: [],
};

// ─── Workspace file builders ────────────────────────────────────────────────

function buildProjectLeadSoul(project: Project, lead: RosterMember): string {
  const roster = project.roster.filter((m) => m.role !== "lead");
  const spawnLines =
    roster.length > 0
      ? roster
          .map((m) => {
            const targets = lead.spawnTargets;
            const canSpawn = !targets || targets.includes(m.agentId);
            return canSpawn
              ? `- ${m.agentName} (${m.customRoleLabel ?? m.role}): available for delegation`
              : null;
          })
          .filter(Boolean)
          .join("\n")
      : "- No agents configured in roster";

  const modeText =
    project.operationMode === "autonomous"
      ? "You have full authority to assign, execute, and complete tasks without human approval."
      : project.operationMode === "supervised"
        ? "You can assign and execute tasks. Moving tasks to Done requires human approval."
        : "Every status change requires human approval. Suggest actions but wait for confirmation.";

  return `# Soul — ${lead.agentName}

## Identity
You are ${lead.agentName}, the Board Lead for project "${project.name}".
Your job is to coordinate the roster, delegate tasks, and ensure nothing falls through the cracks.

## Project Context
- **Project**: ${project.name}
- **Description**: ${project.description}
- **Operation Mode**: ${project.operationMode ?? "supervised"}

## Your Responsibilities
1. Monitor the backlog and assign unassigned tasks to the right agent
2. Spawn roster agents for task execution
3. Track execution progress and react to blockers
4. Report status through heartbeat updates
5. Escalate to human when uncertainty is high or a task is blocked > 30 minutes

## Roster Available for Delegation
${spawnLines}

## Operation Mode: ${project.operationMode ?? "supervised"}
${modeText}

## Style
- Direct and technical — no corporate fluff
- Proactive: anticipate blockers before they hit
- Delegate with full context, never just a task ID
- Escalate to human if uncertainty > 70%

## Hard Limits
- Never deploy to production without a review step
- Never skip quality gates
- Always preserve the audit trail
- Save progress to WORKING.md before ending session
`;
}

function buildProjectAgentsMd(project: Project): string {
  const hbSeconds = project.heartbeatConfig?.intervalSeconds ?? 60;

  return `# ${project.name} — Board Lead Workspace

## Every Session
1. Read WORKING.md for current task state (if resuming)
2. Check board state: what tasks exist, what status, who is assigned
3. Check roster: which agents are available
4. Unblock any blocked tasks first
5. Assign unassigned high-priority backlog items

## Task Workflow
When a new task appears in Backlog:
1. Evaluate priority (critical > high > medium > low)
2. Determine best agent for the task based on role and skills
3. Spawn the agent via sessions_spawn with full task context
4. Update task status: Backlog → In Progress
5. Monitor agent execution
6. When agent reports completion: move to Review (supervised) or Done (autonomous)

## Delegation Protocol
When spawning an agent:
1. Provide clear task description
2. Include all relevant context files
3. Set expectations for output format
4. Set deadline if applicable

## Blocker Protocol
When a task is blocked:
1. Attempt to resolve independently (search docs, check context)
2. If unresolvable within 15 minutes: escalate to human
3. Move task to Blocked column with reason

## Heartbeat
- Board review: every ${hbSeconds}s — check columns, auto-delegate pending tasks
- Agent health: ping roster agents, note degraded ones
- Memory sync: log today's decisions to memory/

## Memory Rules
- Log all task completions with outcome
- Log all blockers with resolution
- Log delegation decisions (who got what and why)
`;
}

function buildProjectHeartbeatMd(project: Project): string {
  const hbSeconds = project.heartbeatConfig?.intervalSeconds ?? 60;
  const staleHours = 24;

  return `# Heartbeat Tasks

## Board Check
- Schedule: every ${hbSeconds}s
- Task: Check board for new tasks in backlog. If unassigned tasks exist and agents are available, delegate.

## Stale Task Detection
- Schedule: every 30m
- Task: Check all In Progress tasks. If any task has no update for more than ${staleHours}h, flag as potentially stale and investigate.

## Agent Health
- Schedule: every 60s
- Task: Check status of all spawned agent sessions. If any session is unresponsive, log warning and consider reassignment.
`;
}

function buildActivationMessage(project: Project, lead: RosterMember): string {
  const projectStore = useProjectsStore.getState();
  const tasks = projectStore.tasks[project.id] ?? [];
  const backlog = tasks.filter((t) => t.status === "backlog");
  const inProgress = tasks.filter((t) => t.status === "progress");
  const roster = project.roster.filter((m) => m.role !== "lead");

  const backlogLines =
    backlog.length > 0
      ? backlog.map((t) => `  - [${t.priority}] ${t.title}: ${t.description}`).join("\n")
      : "  (empty)";

  const rosterLines =
    roster.length > 0
      ? roster.map((m) => `- ${m.agentName} (${m.customRoleLabel ?? m.role})`).join("\n")
      : "- No roster agents configured";

  return `Project "${project.name}" activated. You are the board lead.

## Board State
- Backlog: ${backlog.length} task(s)
${backlogLines}
- In Progress: ${inProgress.length} task(s)
- Review: ${tasks.filter((t) => t.status === "review").length}
- Blocked: ${tasks.filter((t) => t.status === "blocked").length}
- Done: ${tasks.filter((t) => t.status === "done").length}

## Roster Available
${rosterLines}

## Operation Mode: ${project.operationMode ?? "supervised"}

Begin by organizing the backlog. Prioritize tasks and initiate delegation as appropriate for your operation mode.`.trim();
}

// ─── chat.send helper ────────────────────────────────────────────────────────

function sendChatMessage(sessionKey: string, message: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `activate-chat-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);

    const timeout = setTimeout(() => {
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, error: "Request timed out" });
    }, 15_000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "res" && msg.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          unregisterExternalRpcResponseId(id);
          if (msg.ok) {
            resolve({ ok: true });
          } else {
            const err = msg.error as { message?: string } | undefined;
            resolve({ ok: false, error: err?.message ?? "Unknown error" });
          }
        }
      } catch { /* ignore */ }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({
      type: "req",
      id,
      method: "chat.send",
      params: { sessionKey, message, idempotencyKey: id },
    }));
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ActivationStep =
  | "creating-agent"
  | "writing-files"
  | "opening-session"
  | "done"
  | "error";

export interface ActivationResult {
  ok: boolean;
  error?: string;
}

/**
 * Activate a project: registers agent in gateway, writes workspace files,
 * opens a persistent session for the board lead, and sends the activation message.
 *
 * Progress callbacks are optional — useful to show step-by-step UI feedback.
 */
export async function activateProject(
  projectId: string,
  onStep?: (step: ActivationStep) => void,
): Promise<ActivationResult> {
  const store = useProjectsStore.getState();
  const gwStore = useGatewayStore.getState();

  const project = store.projects.find((p) => p.id === projectId);
  const lead = project?.roster.find((m) => m.role === "lead");

  if (!project || !lead) {
    return { ok: false, error: "Project or lead not found" };
  }

  if (!gwStore._ws || gwStore._ws.readyState !== WebSocket.OPEN) {
    return { ok: false, error: "Gateway not connected" };
  }

  const agentId = lead.agentId;
  const workspace = project.workspacePath || `${gwStore.stateDir ?? "~/.openclaw"}/projects/${projectId}/agent`;

  // ── Step 1: Register agent (or update workspace if it already exists) ──────

  onStep?.("creating-agent");

  const createResult = await createAgentViaGateway({
    name: lead.agentName,
    workspace,
  });

  // agents.create may fail if the agent already exists — that's fine, we continue
  if (!createResult.ok && !createResult.error?.toLowerCase().includes("exist")) {
    return { ok: false, error: `Failed to register agent: ${createResult.error}` };
  }

  const effectiveAgentId = createResult.agentId ?? agentId;

  // ── Step 2: Write workspace files ─────────────────────────────────────────

  onStep?.("writing-files");

  const files: Array<[string, string]> = [
    ["SOUL.md", buildProjectLeadSoul(project, lead)],
    ["AGENTS.md", buildProjectAgentsMd(project)],
    ["HEARTBEAT.md", buildProjectHeartbeatMd(project)],
  ];

  for (const [fileName, content] of files) {
    const result = await setAgentFileViaGateway(effectiveAgentId, fileName, content);
    if (!result.ok) {
      console.warn(`[Activation] Failed to write ${fileName}:`, result.error);
      // Non-fatal: workspace files can be written later
    }
  }

  // ── Step 3: Enable permanent heartbeat — neverSleep: true ────────────────

  const hbConfig: RosterHeartbeatConfig = lead.heartbeatConfig
    ? { ...LEAD_ALWAYS_ON_HEARTBEAT, intervalSeconds: lead.heartbeatConfig.intervalSeconds }
    : LEAD_ALWAYS_ON_HEARTBEAT;

  const hbResult = await syncHeartbeatToGateway(effectiveAgentId, hbConfig);
  if (!hbResult.ok) {
    console.warn("[Activation] Failed to configure heartbeat:", hbResult.error);
    // Non-fatal: the agent will still receive the activation message
  }

  // ── Step 4: Open session — send activation message ────────────────────────

  onStep?.("opening-session");

  const group = project.groupId
    ? store.groups.find((g) => g.id === project.groupId)
    : undefined;
  const sessionKey = buildAgentSessionKey(effectiveAgentId, project, group?.agentId);
  const activationMessage = buildActivationMessage(project, lead);

  const chatResult = await sendChatMessage(sessionKey, activationMessage);
  if (!chatResult.ok) {
    console.warn("[Activation] Failed to open session:", chatResult.error);
    // Non-fatal: session can be opened by the next heartbeat
  }

  // ── Step 5: Persist activation state + gateway agent ID ─────────────────

  const updatedRoster = project.roster.map((m) =>
    m.agentId === lead.agentId ? { ...m, gatewayAgentId: effectiveAgentId } : m,
  );

  await store.updateProject(projectId, {
    status: "active",
    roster: updatedRoster,
  });

  onStep?.("done");

  return { ok: true };
}

/**
 * Pause a project: saves state and suspends the lead session.
 * The lead is notified to save WORKING.md before the session goes idle.
 */
export async function pauseProject(projectId: string): Promise<ActivationResult> {
  const store = useProjectsStore.getState();
  const gwStore = useGatewayStore.getState();

  const project = store.projects.find((p) => p.id === projectId);
  const lead = project?.roster.find((m) => m.role === "lead");
  if (!project || !lead) return { ok: false, error: "Project or lead not found" };

  const leadGwId = lead.gatewayAgentId ?? lead.agentId;

  if (gwStore._ws?.readyState === WebSocket.OPEN) {
    const group = project.groupId
      ? store.groups.find((g) => g.id === project.groupId)
      : undefined;
    const sessionKey = buildAgentSessionKey(leadGwId, project, group?.agentId);

    await sendChatMessage(
      sessionKey,
      `Project "${project.name}" is being paused. Save your current state to WORKING.md immediately. Log all in-progress work. You will resume from this state when the project is reactivated.`,
    );
  }

  // Disable heartbeat — agent goes idle while project is paused
  await syncHeartbeatToGateway(leadGwId, LEAD_PAUSED_HEARTBEAT).catch(() => {
    /* non-fatal */
  });

  await store.updateProject(projectId, { status: "paused" });
  return { ok: true };
}

/**
 * Resume a paused project: re-sends activation context so the lead
 * picks up from WORKING.md.
 */
export async function resumeProject(projectId: string): Promise<ActivationResult> {
  const store = useProjectsStore.getState();
  const gwStore = useGatewayStore.getState();

  const project = store.projects.find((p) => p.id === projectId);
  const lead = project?.roster.find((m) => m.role === "lead");
  if (!project || !lead) return { ok: false, error: "Project or lead not found" };

  if (!gwStore._ws || gwStore._ws.readyState !== WebSocket.OPEN) {
    return { ok: false, error: "Gateway not connected" };
  }

  const leadGwId = lead.gatewayAgentId ?? lead.agentId;
  const group = project.groupId
    ? store.groups.find((g) => g.id === project.groupId)
    : undefined;
  const sessionKey = buildAgentSessionKey(leadGwId, project, group?.agentId);

  const tasks = store.tasks[projectId] ?? [];
  const inProgress = tasks.filter((t) => t.status === "progress");
  const blocked = tasks.filter((t) => t.status === "blocked");

  const resumeMessage = `Project "${project.name}" resumed. Read WORKING.md for the state saved before pause.

## Current Board State
- In Progress: ${inProgress.length} task(s)${inProgress.length > 0 ? "\n" + inProgress.map((t) => `  - [${t.priority}] ${t.title}`).join("\n") : ""}
- Blocked: ${blocked.length} task(s)${blocked.length > 0 ? "\n" + blocked.map((t) => `  - ${t.title}`).join("\n") : ""}
- Backlog: ${tasks.filter((t) => t.status === "backlog").length} task(s)

Resume from where you left off. Address blocked tasks first, then continue with in-progress items.`.trim();

  const chatResult = await sendChatMessage(sessionKey, resumeMessage);
  if (!chatResult.ok) {
    console.warn("[Resume] Failed to open session:", chatResult.error);
  }

  // Re-enable permanent heartbeat on resume
  const hbConfig: RosterHeartbeatConfig = lead.heartbeatConfig
    ? { ...LEAD_ALWAYS_ON_HEARTBEAT, intervalSeconds: lead.heartbeatConfig.intervalSeconds }
    : LEAD_ALWAYS_ON_HEARTBEAT;

  await syncHeartbeatToGateway(leadGwId, hbConfig).catch(() => {
    /* non-fatal */
  });

  await store.updateProject(projectId, { status: "active" });
  return { ok: true };
}
