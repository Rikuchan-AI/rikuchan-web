import { useGatewayStore, registerExternalRpcResponseId, unregisterExternalRpcResponseId } from "./gateway-store";

// ─── Core file templates for new agents ─────────────────────────────────────

export const AGENT_CORE_FILES = [
  { name: "AGENTS.md",    label: "Agents",    description: "Workspace overview, session startup, memory strategy" },
  { name: "SOUL.md",      label: "Soul",      description: "Personality, core truths, boundaries, vibe" },
  { name: "TOOLS.md",     label: "Tools",     description: "Local tool configuration and preferences" },
  { name: "IDENTITY.md",  label: "Identity",  description: "Name, emoji, creature type, vibe, avatar" },
  { name: "USER.md",      label: "User",      description: "Information about the human operator" },
  { name: "HEARTBEAT.md", label: "Heartbeat", description: "Periodic background task checklist" },
  { name: "BOOTSTRAP.md", label: "Bootstrap", description: "Onboarding script for first run" },
  { name: "MEMORY.md",    label: "Memory",    description: "Long-term curated memory" },
] as const;

export type AgentFileName = typeof AGENT_CORE_FILES[number]["name"];

// ─── Templates ──────────────────────────────────────────────────────────────

export function generateIdentityMd(opts: {
  name?: string;
  emoji?: string;
  creature?: string;
  vibe?: string;
  avatar?: string;
}): string {
  const lines: string[] = ["# Identity\n"];
  if (opts.name)     lines.push(`- **Name:** ${opts.name}`);
  if (opts.emoji)    lines.push(`- **Emoji:** ${opts.emoji}`);
  if (opts.creature) lines.push(`- **Creature:** ${opts.creature}`);
  if (opts.vibe)     lines.push(`- **Vibe:** ${opts.vibe}`);
  if (opts.avatar)   lines.push(`- **Avatar:** ${opts.avatar}`);
  if (lines.length === 1) {
    lines.push("- **Name:** (pick something you like)");
    lines.push("- **Creature:** (AI? robot? familiar?)");
    lines.push("- **Vibe:** (sharp? warm? chaotic? calm?)");
    lines.push("- **Emoji:** (your signature)");
  }
  return lines.join("\n") + "\n";
}

export function generateSoulMd(name: string): string {
  return `# Soul — ${name}

## Core Truths
- You are ${name}, an AI agent in the OpenClaw ecosystem.
- You are competent, resourceful, and trustworthy.
- You respect the user's time and communicate concisely.

## Boundaries
- Respect privacy and data boundaries.
- Only take actions within your authorized scope.
- Ask before performing irreversible operations.

## Vibe
- Be helpful, direct, and technically precise.
- Avoid unnecessary filler or corporate speak.
`;
}

export function generateAgentsMd(name: string): string {
  return `# ${name} — Workspace

## Sessions
- Each conversation is a session with context and purpose.
- Maintain continuity across sessions via MEMORY.md.

## Memory Strategy
- Save important decisions and learnings to MEMORY.md.
- Reference past context when relevant.
- Keep memory concise and actionable.
`;
}

export function generateUserMd(): string {
  return `# User Context

- The user operates this agent through the OpenClaw Mission Control dashboard.
- Respect their preferences and working style.
`;
}

export function generateToolsMd(): string {
  return `# Tools Configuration

- Default tool configuration applies.
- Customize tool preferences here as needed.
`;
}

export function generateHeartbeatMd(): string {
  return `# Heartbeat Tasks

- [ ] Check workspace state
- [ ] Review recent activity
- [ ] Update status if needed
`;
}

export function generateBootstrapMd(name: string): string {
  return `# Bootstrap — ${name}

Welcome! This is your first session. Let's get set up:

1. Review your SOUL.md and IDENTITY.md
2. Familiarize yourself with the workspace
3. Check available tools via TOOLS.md
4. Start your first task

Once onboarding is complete, this file will no longer be loaded.
`;
}

// ─── Gateway RPC helpers ────────────────────────────────────────────────────

export function createAgentViaGateway(params: {
  name: string;
  workspace: string;
  emoji?: string;
  avatar?: string;
}): Promise<{ ok: boolean; agentId?: string; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `create-agent-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);
    const timeout = setTimeout(() => {
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, error: "Request timed out" });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          unregisterExternalRpcResponseId(id);
          if (msg.ok) {
            const payload = msg.payload as { agentId?: string };
            resolve({ ok: true, agentId: payload.agentId });
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
      method: "agents.create",
      params: {
        name: params.name,
        workspace: params.workspace,
        ...(params.emoji ? { emoji: params.emoji } : {}),
        ...(params.avatar ? { avatar: params.avatar } : {}),
      },
    }));
  });
}

export function setAgentFileViaGateway(agentId: string, fileName: string, content: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `set-file-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);
    const timeout = setTimeout(() => {
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, error: "Request timed out" });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
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
      method: "agents.files.set",
      params: { agentId, name: fileName, content },
    }));
  });
}

export function listAgentFilesViaGateway(agentId: string): Promise<{
  ok: boolean;
  files?: Array<{ name: string; path: string; missing: boolean; size?: number; content?: string }>;
  error?: string;
}> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `list-files-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);
    const timeout = setTimeout(() => {
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, error: "Request timed out" });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          unregisterExternalRpcResponseId(id);
          if (msg.ok) {
            const payload = msg.payload as { files?: Array<{ name: string; path: string; missing: boolean; size?: number; content?: string }> };
            resolve({ ok: true, files: payload.files });
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
      method: "agents.files.list",
      params: { agentId },
    }));
  });
}

export function getAgentFileViaGateway(agentId: string, fileName: string): Promise<{
  ok: boolean;
  content?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `get-file-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);
    const timeout = setTimeout(() => {
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, error: "Request timed out" });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          unregisterExternalRpcResponseId(id);
          if (msg.ok) {
            const payload = msg.payload as { file?: { content?: string } };
            resolve({ ok: true, content: payload.file?.content });
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
      method: "agents.files.get",
      params: { agentId, name: fileName },
    }));
  });
}

/**
 * Fetch per-agent subagents.allowAgents config from the gateway.
 * Returns a map of agentId → allowAgents (string[] or ["*"] for allow-all).
 */
export function getAgentSpawnConfigFromGateway(): Promise<{
  ok: boolean;
  spawnConfig?: Record<string, string[]>;
  error?: string;
}> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `config-get-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const timeout = setTimeout(() => {
      resolve({ ok: false, error: "Request timed out" });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          if (msg.ok) {
            const config = msg.payload?.config as Record<string, unknown> | undefined;
            const agents = (config?.agents as { list?: Array<Record<string, unknown>> })?.list;
            const spawnConfig: Record<string, string[]> = {};

            if (agents) {
              for (const agent of agents) {
                const agentId = agent.id as string;
                const subagents = agent.subagents as { allowAgents?: string[] } | undefined;
                if (subagents?.allowAgents) {
                  spawnConfig[agentId] = subagents.allowAgents;
                }
              }
            }

            resolve({ ok: true, spawnConfig });
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
      method: "config.get",
      params: {},
    }));
  });
}

/**
 * Update an agent's subagents.allowAgents via config.patch.
 */
export function setAgentSpawnConfigViaGateway(
  agentId: string,
  allowAgents: string[],
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    // First get current config to obtain baseHash
    const getId = `config-get-for-patch-${Date.now()}`;
    const getTimeout = setTimeout(() => resolve({ ok: false, error: "Timed out getting config" }), 10000);

    const getHandler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === getId) {
          ws.removeEventListener("message", getHandler);
          clearTimeout(getTimeout);

          if (!msg.ok) {
            resolve({ ok: false, error: "Failed to get config" });
            return;
          }

          const baseHash = msg.payload?.hash as string | undefined;
          const config = msg.payload?.config as { agents?: { list?: Array<Record<string, unknown>> } } | undefined;
          const agentsList = config?.agents?.list ?? [];

          // Update the specific agent's subagents.allowAgents
          const updatedList = agentsList.map((a) => {
            if ((a.id as string) === agentId) {
              return { ...a, subagents: { ...(a.subagents as Record<string, unknown> ?? {}), allowAgents } };
            }
            return a;
          });

          // Patch via config.patch
          const patchId = `config-patch-${Date.now()}`;
          const patchTimeout = setTimeout(() => resolve({ ok: false, error: "Patch timed out" }), 10000);

          const patchHandler = (event2: MessageEvent) => {
            try {
              const msg2 = JSON.parse(event2.data);
              if (msg2.type === "res" && msg2.id === patchId) {
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

/**
 * Patch per-agent config fields and/or global agent defaults after agent creation.
 * - perAgent: written to agents.list[x] entry (subagents, humanDelay, etc.)
 * - globalDefaults: merged into agents.defaults (thinkingDefault, verboseDefault, etc.)
 * Only non-empty/non-null values are applied.
 */
export function patchAgentDefaults(params: {
  agentId: string;
  perAgent: Record<string, unknown>;
  globalDefaults: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const { agentId, perAgent, globalDefaults } = params;

  // Nothing to do
  const hasPerAgent = Object.keys(perAgent).length > 0;
  const hasGlobal = Object.keys(globalDefaults).length > 0;
  if (!hasPerAgent && !hasGlobal) return Promise.resolve({ ok: true });

  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const getId = `config-get-defaults-${Date.now()}`;
    const getTimeout = setTimeout(() => resolve({ ok: false, error: "Timed out getting config" }), 10000);

    const getHandler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "res" || msg.id !== getId) return;
        ws.removeEventListener("message", getHandler);
        clearTimeout(getTimeout);

        if (!msg.ok) {
          resolve({ ok: false, error: "Failed to get config" });
          return;
        }

        const baseHash = msg.payload?.hash as string | undefined;
        const config = msg.payload?.config as {
          agents?: {
            list?: Array<Record<string, unknown>>;
            defaults?: Record<string, unknown>;
          };
        } | undefined;

        const agentsList = config?.agents?.list ?? [];
        const existingDefaults = config?.agents?.defaults ?? {};

        // Merge per-agent fields into this agent's list entry
        const updatedList = agentsList.map((a) => {
          if ((a.id as string) !== agentId) return a;
          const merged: Record<string, unknown> = { ...a };
          for (const [k, v] of Object.entries(perAgent)) {
            if (v !== null && v !== undefined && v !== "") merged[k] = v;
          }
          return merged;
        });

        // Merge global defaults
        const updatedDefaults: Record<string, unknown> = { ...existingDefaults };
        for (const [k, v] of Object.entries(globalDefaults)) {
          if (v !== null && v !== undefined && v !== "") updatedDefaults[k] = v;
        }

        const patchPayload: Record<string, unknown> = { agents: { list: updatedList } };
        if (Object.keys(updatedDefaults).length > 0) {
          (patchPayload.agents as Record<string, unknown>).defaults = updatedDefaults;
        }

        const patchId = `config-patch-defaults-${Date.now()}`;
        const patchTimeout = setTimeout(() => resolve({ ok: false, error: "Patch timed out" }), 10000);

        const patchHandler = (event2: MessageEvent) => {
          try {
            const msg2 = JSON.parse(event2.data);
            if (msg2.type !== "res" || msg2.id !== patchId) return;
            ws.removeEventListener("message", patchHandler);
            clearTimeout(patchTimeout);
            resolve({ ok: !!msg2.ok, error: msg2.error?.message });
          } catch { /* ignore */ }
        };

        ws.addEventListener("message", patchHandler);
        ws.send(JSON.stringify({
          type: "req",
          id: patchId,
          method: "config.patch",
          params: { baseHash, raw: JSON.stringify(patchPayload) },
        }));
      } catch { /* ignore */ }
    };

    ws.addEventListener("message", getHandler);
    ws.send(JSON.stringify({ type: "req", id: getId, method: "config.get", params: {} }));
  });
}

// ─── Delete agent ────────────────────────────────────────────────────────────

export function deleteAgentViaGateway(agentId: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `delete-agent-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);
    const timeout = setTimeout(() => {
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, error: "Request timed out" });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
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
    ws.send(JSON.stringify({ type: "req", id, method: "agents.delete", params: { agentId } }));
  });
}

// ─── Get free models from config ─────────────────────────────────────────────

export type FreeModelEntry = {
  provider: string;
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
};

export function getFreeModelsFromConfig(): Promise<{ ok: boolean; groups?: Array<{ provider: string; models: FreeModelEntry[] }>; error?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, error: "Gateway not connected" });
      return;
    }

    const id = `config-get-free-models-${Date.now()}`;
    const timeout = setTimeout(() => resolve({ ok: false, error: "Request timed out" }), 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== "res" || msg.id !== id) return;
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);

        if (!msg.ok) {
          resolve({ ok: false, error: "Failed to get config" });
          return;
        }

        type ProviderModels = {
          models?: Array<{
            id: string;
            name?: string;
            contextWindow?: number;
            maxTokens?: number;
            cost?: { input?: number; output?: number };
          }>;
        };
        const providers = msg.payload?.config?.models?.providers as Record<string, ProviderModels> | undefined;
        if (!providers) {
          resolve({ ok: true, groups: [] });
          return;
        }

        // Exclude internal/auxiliary providers not meant for user selection
        const EXCLUDED_PROVIDERS = ["rikuchan-heartbeat"];

        const groups: Array<{ provider: string; models: FreeModelEntry[] }> = [];
        for (const [providerKey, providerCfg] of Object.entries(providers)) {
          if (EXCLUDED_PROVIDERS.includes(providerKey)) continue;
          const freeModels = (providerCfg.models ?? []).filter(
            (m) => m.cost != null && m.cost.input === 0 && m.cost.output === 0
          );
          if (freeModels.length > 0) {
            groups.push({
              provider: providerKey,
              models: freeModels.map((m) => ({
                provider: providerKey,
                id: m.id,
                name: m.name ?? m.id,
                contextWindow: m.contextWindow,
                maxTokens: m.maxTokens,
              })),
            });
          }
        }
        resolve({ ok: true, groups });
      } catch { /* ignore */ }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ type: "req", id, method: "config.get", params: {} }));
  });
}

// ─── List existing workspaces ───────────────────────────────────────────────

export interface ExistingWorkspace {
  agentId: string;
  agentName: string;
  workspace: string;
}

/**
 * Fetch all existing agent workspaces from openclaw config.
 * Returns a list of { agentId, agentName, workspace } for each registered agent.
 */
export function listWorkspacesViaGateway(): Promise<{ ok: boolean; workspaces: ExistingWorkspace[]; stateDir?: string }> {
  return new Promise((resolve) => {
    const store = useGatewayStore.getState();
    const ws = store._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      resolve({ ok: false, workspaces: [] });
      return;
    }

    const id = `list-ws-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    registerExternalRpcResponseId(id);
    const timeout = setTimeout(() => {
      ws.removeEventListener("message", handler);
      unregisterExternalRpcResponseId(id);
      resolve({ ok: false, workspaces: [] });
    }, 10000);

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "res" && msg.id === id) {
          ws.removeEventListener("message", handler);
          clearTimeout(timeout);
          unregisterExternalRpcResponseId(id);
          if (!msg.ok) {
            resolve({ ok: false, workspaces: [] });
            return;
          }
          const config = msg.payload?.config as Record<string, unknown> | undefined;
          const agentsCfg = config?.agents as { list?: Array<Record<string, unknown>> } | undefined;
          const stateDir = (config?.session as Record<string, unknown>)?.store as string | undefined;
          const workspaces: ExistingWorkspace[] = [];
          if (agentsCfg?.list) {
            for (const a of agentsCfg.list) {
              const agentId = a.id as string;
              const workspace = a.workspace as string | undefined;
              const agentName = a.name as string ?? agentId;
              if (workspace) {
                workspaces.push({ agentId, agentName, workspace });
              }
            }
          }
          resolve({ ok: true, workspaces, stateDir: stateDir ?? undefined });
        }
      } catch { /* ignore */ }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ type: "req", id, method: "config.get", params: {} }));
  });
}
