import { getApiClient, McApiError } from "./api-client";

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

// ─── Gateway RPC via backend proxy ──────────────────────────────────────────

async function gatewayRpc<T = Record<string, unknown>>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const result = await getApiClient().gatewayRpc(method, params);
    return { ok: true, data: result as T };
  } catch (err) {
    if (err instanceof McApiError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: String(err) };
  }
}

// ─── Agent CRUD ─────────────────────────────────────────────────────────────

export async function createAgentViaGateway(params: {
  name: string;
  workspace: string;
  emoji?: string;
  avatar?: string;
}): Promise<{ ok: boolean; agentId?: string; error?: string }> {
  const result = await gatewayRpc<{ agentId?: string }>("agents.create", {
    name: params.name,
    workspace: params.workspace,
    ...(params.emoji ? { emoji: params.emoji } : {}),
    ...(params.avatar ? { avatar: params.avatar } : {}),
  });
  return { ok: result.ok, agentId: result.data?.agentId, error: result.error };
}

export async function deleteAgentViaGateway(
  agentId: string,
): Promise<{ ok: boolean; error?: string }> {
  return gatewayRpc("agents.delete", { agentId });
}

// ─── Agent Files ────────────────────────────────────────────────────────────

export async function setAgentFileViaGateway(
  agentId: string,
  fileName: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  return gatewayRpc("agents.files.set", { agentId, name: fileName, content });
}

export async function listAgentFilesViaGateway(agentId: string): Promise<{
  ok: boolean;
  files?: Array<{ name: string; path: string; missing: boolean; size?: number; content?: string }>;
  error?: string;
}> {
  const result = await gatewayRpc<{ files?: Array<{ name: string; path: string; missing: boolean; size?: number; content?: string }> }>(
    "agents.files.list",
    { agentId },
  );
  return { ok: result.ok, files: result.data?.files, error: result.error };
}

export async function getAgentFileViaGateway(
  agentId: string,
  fileName: string,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const result = await gatewayRpc<{ file?: { content?: string } }>(
    "agents.files.get",
    { agentId, name: fileName },
  );
  return { ok: result.ok, content: result.data?.file?.content, error: result.error };
}

// ─── Config Operations ──────────────────────────────────────────────────────

export async function getAgentSpawnConfigFromGateway(): Promise<{
  ok: boolean;
  spawnConfig?: Record<string, string[]>;
  error?: string;
}> {
  const result = await gatewayRpc<{ config?: { agents?: { list?: Array<Record<string, unknown>> } } }>(
    "config.get",
    {},
  );
  if (!result.ok || !result.data) return { ok: false, error: result.error };

  const agents = result.data.config?.agents?.list;
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
  return { ok: true, spawnConfig };
}

export async function setAgentSpawnConfigViaGateway(
  agentId: string,
  allowAgents: string[],
): Promise<{ ok: boolean; error?: string }> {
  // Get current config
  const getResult = await gatewayRpc<{ hash?: string; config?: { agents?: { list?: Array<Record<string, unknown>> } } }>(
    "config.get",
    {},
  );
  if (!getResult.ok || !getResult.data) return { ok: false, error: "Failed to get config" };

  const baseHash = getResult.data.hash;
  const agentsList = getResult.data.config?.agents?.list ?? [];

  const updatedList = agentsList.map((a) => {
    if ((a.id as string) === agentId) {
      return { ...a, subagents: { ...(a.subagents as Record<string, unknown> ?? {}), allowAgents } };
    }
    return a;
  });

  return gatewayRpc("config.patch", {
    baseHash,
    raw: JSON.stringify({ agents: { list: updatedList } }),
  });
}

export async function patchAgentDefaults(params: {
  agentId: string;
  perAgent: Record<string, unknown>;
  globalDefaults: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const { agentId, perAgent, globalDefaults } = params;
  const hasPerAgent = Object.keys(perAgent).length > 0;
  const hasGlobal = Object.keys(globalDefaults).length > 0;
  if (!hasPerAgent && !hasGlobal) return { ok: true };

  const getResult = await gatewayRpc<{
    hash?: string;
    config?: { agents?: { list?: Array<Record<string, unknown>>; defaults?: Record<string, unknown> } };
  }>("config.get", {});
  if (!getResult.ok || !getResult.data) return { ok: false, error: "Failed to get config" };

  const baseHash = getResult.data.hash;
  const agentsList = getResult.data.config?.agents?.list ?? [];
  const existingDefaults = getResult.data.config?.agents?.defaults ?? {};

  const updatedList = agentsList.map((a) => {
    if ((a.id as string) !== agentId) return a;
    const merged: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(perAgent)) {
      if (v !== null && v !== undefined && v !== "") merged[k] = v;
    }
    return merged;
  });

  const updatedDefaults: Record<string, unknown> = { ...existingDefaults };
  for (const [k, v] of Object.entries(globalDefaults)) {
    if (v !== null && v !== undefined && v !== "") updatedDefaults[k] = v;
  }

  const patchPayload: Record<string, unknown> = { agents: { list: updatedList } };
  if (Object.keys(updatedDefaults).length > 0) {
    (patchPayload.agents as Record<string, unknown>).defaults = updatedDefaults;
  }

  return gatewayRpc("config.patch", {
    baseHash,
    raw: JSON.stringify(patchPayload),
  });
}

// ─── Free Models ────────────────────────────────────────────────────────────

export type FreeModelEntry = {
  provider: string;
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
};

export async function getFreeModelsFromConfig(): Promise<{
  ok: boolean;
  groups?: Array<{ provider: string; models: FreeModelEntry[] }>;
  error?: string;
}> {
  const result = await gatewayRpc<{ config?: { models?: { providers?: Record<string, { models?: Array<{ id: string; name?: string; contextWindow?: number; maxTokens?: number; cost?: { input?: number; output?: number } }> }> } } }>(
    "config.get",
    {},
  );
  if (!result.ok || !result.data) return { ok: false, error: result.error };

  const providers = result.data.config?.models?.providers;
  if (!providers) return { ok: true, groups: [] };

  const EXCLUDED_PROVIDERS = ["rikuchan-heartbeat"];
  const groups: Array<{ provider: string; models: FreeModelEntry[] }> = [];

  for (const [providerKey, providerCfg] of Object.entries(providers)) {
    if (EXCLUDED_PROVIDERS.includes(providerKey)) continue;
    const freeModels = (providerCfg.models ?? []).filter(
      (m) => m.cost != null && m.cost.input === 0 && m.cost.output === 0,
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
  return { ok: true, groups };
}

// ─── Workspaces ─────────────────────────────────────────────────────────────

export interface ExistingWorkspace {
  agentId: string;
  agentName: string;
  workspace: string;
}

export async function listWorkspacesViaGateway(): Promise<{
  ok: boolean;
  workspaces: ExistingWorkspace[];
  stateDir?: string;
}> {
  const result = await gatewayRpc<{ config?: Record<string, unknown> }>("config.get", {});
  if (!result.ok || !result.data) return { ok: false, workspaces: [] };

  const config = result.data.config;
  const agentsCfg = config?.agents as { list?: Array<Record<string, unknown>> } | undefined;
  const stateDir = (config?.session as Record<string, unknown>)?.store as string | undefined;

  const workspaces: ExistingWorkspace[] = [];
  if (agentsCfg?.list) {
    for (const a of agentsCfg.list) {
      const agentId = a.id as string;
      const workspace = a.workspace as string | undefined;
      const agentName = (a.name as string) ?? agentId;
      if (workspace) {
        workspaces.push({ agentId, agentName, workspace });
      }
    }
  }
  return { ok: true, workspaces, stateDir: stateDir ?? undefined };
}
