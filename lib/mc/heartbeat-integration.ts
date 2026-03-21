import {
  registerExternalRpcResponseId,
  unregisterExternalRpcResponseId,
  useGatewayStore,
} from "./gateway-store";
import type {
  Project,
  RosterMember,
  RosterHeartbeatConfig,
  HeartbeatFocus,
  Task,
} from "./types-project";

/**
 * Build a heartbeat prompt for an agent based on their focus areas and project context.
 */
export function buildHeartbeatPrompt(
  agent: RosterMember,
  project: Project,
  tasks: Task[],
  rosterStatus: Array<{ agentId: string; agentName: string; online: boolean }>,
): string {
  const config = agent.heartbeatConfig;
  if (!config) return "";

  const sections: string[] = [
    `# Heartbeat — ${agent.agentName} (${agent.role})`,
    `Project: ${project.name}`,
    `Workspace: ${project.workspacePath}`,
    "",
  ];

  for (const focus of config.focus) {
    sections.push(buildFocusSection(focus, agent, project, tasks, rosterStatus));
  }

  if (config.customPrompt) {
    sections.push("## Custom Instructions", config.customPrompt, "");
  }

  sections.push(
    "## Response Format",
    "Respond with a brief status update. If action is needed, describe what you'll do.",
    "Keep it concise — this is a periodic check, not a full session.",
  );

  return sections.join("\n");
}

function buildFocusSection(
  focus: HeartbeatFocus,
  agent: RosterMember,
  project: Project,
  tasks: Task[],
  rosterStatus: Array<{ agentId: string; agentName: string; online: boolean }>,
): string {
  switch (focus) {
    case "board-review": {
      const backlog = tasks.filter((t) => t.status === "backlog" && !t.assignedAgentId);
      const blocked = tasks.filter((t) => t.status === "blocked");
      const inProgress = tasks.filter((t) => t.status === "progress");
      return [
        "## Board Review",
        `- Unassigned tasks in backlog: ${backlog.length}`,
        backlog.length > 0 ? `  ${backlog.map((t) => `"${t.title}" (${t.priority})`).join(", ")}` : "",
        `- Blocked tasks: ${blocked.length}`,
        blocked.length > 0 ? `  ${blocked.map((t) => `"${t.title}"`).join(", ")}` : "",
        `- In progress: ${inProgress.length}`,
        "",
        "If there are unassigned tasks, decide which roster agent should handle each one.",
        "If there are blocked tasks, investigate and suggest resolution.",
        "",
      ].filter(Boolean).join("\n");
    }

    case "task-progress": {
      const myTasks = tasks.filter((t) => t.assignedAgentId === agent.agentId && t.status === "progress");
      return [
        "## Task Progress Check",
        myTasks.length > 0
          ? `Your active tasks:\n${myTasks.map((t) => `- "${t.title}" (${t.priority}, started ${formatAge(t.startedAt)})`).join("\n")}`
          : "No active tasks assigned to you.",
        "",
        "Report progress on active tasks. Flag any blockers.",
        "",
      ].join("\n");
    }

    case "pending-reviews": {
      const reviewTasks = tasks.filter((t) => t.status === "review");
      return [
        "## Pending Reviews",
        reviewTasks.length > 0
          ? `Tasks awaiting review:\n${reviewTasks.map((t) => `- "${t.title}" by ${t.assignedAgentName ?? "unknown"}`).join("\n")}`
          : "No tasks pending review.",
        "",
        "Review any pending items and provide feedback.",
        "",
      ].join("\n");
    }

    case "research-update":
      return [
        "## Research Update",
        "Check for new information related to your active research tasks.",
        "Update project memory with any new findings.",
        "",
      ].join("\n");

    case "workspace-sync":
      return [
        "## Workspace Sync",
        `Check workspace at: ${project.workspacePath}`,
        "Look for recent changes (git status, new files, modified configs).",
        "Report anything noteworthy.",
        "",
      ].join("\n");

    case "agent-health": {
      const offline = rosterStatus.filter((r) => !r.online);
      return [
        "## Agent Health",
        `Roster: ${rosterStatus.length} agents, ${rosterStatus.filter((r) => r.online).length} online`,
        offline.length > 0
          ? `Offline agents: ${offline.map((r) => r.agentName).join(", ")}`
          : "All agents online.",
        "",
        "If agents are offline with active tasks, flag for redistribution.",
        "",
      ].join("\n");
    }

    case "memory-sync":
      return [
        "## Memory Sync",
        "Review recent activity and save important learnings to project memory.",
        "Keep memory concise and actionable.",
        "",
      ].join("\n");

    case "custom":
      return "";

    default:
      return "";
  }
}

function formatAge(ts: number | undefined): string {
  if (!ts) return "unknown";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

/**
 * Sync heartbeat config to OpenClaw gateway via config.patch.
 * Updates the agent's heartbeat settings in the gateway config.
 */
export function syncHeartbeatToGateway(
  agentId: string,
  config: RosterHeartbeatConfig,
  sessionKey?: string,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    // First get current config
    const getId = `hb-get-${Date.now()}`;
    registerExternalRpcResponseId(getId);
    const getTimeout = setTimeout(() => resolve({ ok: false, error: "Timed out" }), 10000);

    const getHandler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === getId) {
          unregisterExternalRpcResponseId(getId);
          ws.removeEventListener("message", getHandler);
          clearTimeout(getTimeout);

          if (!msg.ok) {
            resolve({ ok: false, error: "Failed to get config" });
            return;
          }

          const baseHash = msg.payload?.hash as string | undefined;
          const currentConfig = msg.payload?.config as { agents?: { list?: Array<Record<string, unknown>> } } | undefined;
          const agentsList = currentConfig?.agents?.list ?? [];

          const heartbeatPatch = {
            every: config.intervalSeconds,
            ...(sessionKey ? { session: sessionKey } : {}),
            ...(config.activeHours ? {
              activeHours: { start: config.activeHours.start, end: config.activeHours.end },
            } : {}),
          };

          const agentInList = agentsList.some((a) => (a.id as string) === agentId);
          console.log(`[HB] syncHeartbeatToGateway agentId=${agentId} found=${agentInList} listIds=${agentsList.map((a) => a.id).join(",")}`);

          // Update existing entry or append if agent not yet in list
          const updatedList = agentInList
            ? agentsList.map((a) =>
                (a.id as string) === agentId ? { ...a, heartbeat: heartbeatPatch } : a,
              )
            : [...agentsList, { id: agentId, heartbeat: heartbeatPatch }];

          // Patch
          const patchId = `hb-patch-${Date.now()}`;
          registerExternalRpcResponseId(patchId);
          const patchTimeout = setTimeout(() => resolve({ ok: false, error: "Patch timed out" }), 10000);

          const patchHandler = (event2: MessageEvent) => {
            try {
              const msg2 = JSON.parse(event2.data);
              if (msg2.type === "res" && msg2.id === patchId) {
                unregisterExternalRpcResponseId(patchId);
                ws.removeEventListener("message", patchHandler);
                clearTimeout(patchTimeout);
                resolve({ ok: !!msg2.ok, error: msg2.error?.message });
              }
            } catch { /* ignore */ }
          };

          ws.addEventListener("message", patchHandler);
          ws.send(JSON.stringify({
            type: "req",
            id: patchId,
            method: "config.patch",
            params: {
              baseHash,
              raw: JSON.stringify({ agents: { list: updatedList } }),
            },
          }));
        }
      } catch { /* ignore */ }
    };

    ws.addEventListener("message", getHandler);
    ws.send(JSON.stringify({ type: "req", id: getId, method: "config.get", params: {} }));
  });
}

function formatHeartbeatEvery(intervalMs: number): string {
  if (intervalMs % 60_000 === 0) return `${intervalMs / 60_000}m`;
  return `${Math.round(intervalMs / 1000)}s`;
}

/**
 * Sync global heartbeat defaults to OpenClaw via config.patch.
 * Persists agents.defaults.heartbeat.model and agents.defaults.heartbeat.every.
 */
export function syncHeartbeatDefaultsToGateway(params: {
  modelRef: string;
  intervalMs: number;
}): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const getId = `hb-defaults-get-${Date.now()}`;
    registerExternalRpcResponseId(getId);
    const getTimeout = setTimeout(() => resolve({ ok: false, error: "Timed out" }), 10000);

    const getHandler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "res" || msg.id !== getId) return;

        unregisterExternalRpcResponseId(getId);
        ws.removeEventListener("message", getHandler);
        clearTimeout(getTimeout);

        if (!msg.ok) {
          resolve({ ok: false, error: "Failed to get config" });
          return;
        }

        const baseHash = msg.payload?.hash as string | undefined;
        const currentConfig = msg.payload?.config as {
          agents?: {
            defaults?: {
              heartbeat?: Record<string, unknown>;
            };
          };
        } | undefined;

        const currentHeartbeat = currentConfig?.agents?.defaults?.heartbeat ?? {};
        const patchId = `hb-defaults-patch-${Date.now()}`;
        registerExternalRpcResponseId(patchId);
        const patchTimeout = setTimeout(
          () => resolve({ ok: false, error: "Patch timed out" }),
          10000
        );

        const patchHandler = (event2: MessageEvent) => {
          try {
            const msg2 = JSON.parse(event2.data);
            if (msg2.type === "res" && msg2.id === patchId) {
              unregisterExternalRpcResponseId(patchId);
              ws.removeEventListener("message", patchHandler);
              clearTimeout(patchTimeout);
              resolve({ ok: !!msg2.ok, error: msg2.error?.message });
            }
          } catch {
            /* ignore */
          }
        };

        ws.addEventListener("message", patchHandler);
        ws.send(
          JSON.stringify({
            type: "req",
            id: patchId,
            method: "config.patch",
            params: {
              baseHash,
              raw: JSON.stringify({
                agents: {
                  defaults: {
                    heartbeat: {
                      ...currentHeartbeat,
                      every: formatHeartbeatEvery(params.intervalMs),
                      model: params.modelRef,
                    },
                  },
                },
              }),
            },
          })
        );
      } catch {
        /* ignore */
      }
    };

    ws.addEventListener("message", getHandler);
    ws.send(JSON.stringify({ type: "req", id: getId, method: "config.get", params: {} }));
  });
}
