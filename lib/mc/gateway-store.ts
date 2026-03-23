"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  Agent,
  Session,
  LogEntry,
  GatewayConfig,
  GatewayCommand,
  HeartbeatConfig,
  ActivityEvent,
  ModelGroup,
} from "./types";
import { getApiClient } from "./api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeartbeatStoreStats {
  totalBeats: number;
  failures: number;
  lastSuccessAt: number;
  currentModel: string;
}

const DEFAULT_CONFIG: GatewayConfig = {
  url: "",
  token: "",
  autoReconnect: true,
  permissionMode: "allow-all",
};

const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  model: "gemini-2.0-flash-exp",
  fallbackChain: [
    "gemini-2.0-flash-exp",
    "llama-3.1-8b-instant",
    "gemini-1.5-flash-8b",
  ],
  intervalMs: 30_000,
  timeoutMs: 5_000,
  maxRetries: 3,
  backoffMultiplier: 2,
};

// ─── Store Interface ─────────────────────────────────────────────────────────
// Keeps the same public API as before — consumers don't change.
// Internals: REST+SSE backed, zero WebSocket.

interface GatewayStore {
  status: "connecting" | "connected" | "disconnected" | "error";
  latencyMs: number;
  connectedAt?: number;
  serverVersion?: string;
  connId?: string;
  stateDir?: string;
  reconnectAttempts: number;
  reconnectAt?: number;
  expectedRestartReason?: "heartbeat-model-update" | "config-patch";

  agents: Agent[];
  registeredAgents: Agent[];
  sessions: Session[];
  logs: LogEntry[];
  activity: ActivityEvent[];

  config: GatewayConfig;
  leadBoardAgent: { model: string; provider: string };
  availableModels: ModelGroup[];
  agentsLoaded: boolean;
  sessionsLoaded: boolean;
  modelsLoaded: boolean;
  heartbeatConfig: HeartbeatConfig;
  heartbeatStats: HeartbeatStoreStats;
  pendingApprovals: {
    agentId: string;
    agentName: string;
    action: string;
    expiresAt: number;
  }[];

  _ws: WebSocket | null;
  _pingInterval: ReturnType<typeof setInterval> | null;
  _configHydrated: boolean;
  _authenticated: boolean;
  _lastTickAt: number;
  _logSeq: number;

  hydrateConfig: () => void;
  connect: (url?: string, token?: string) => void;
  disconnect: () => void;
  sendCommand: (command: GatewayCommand) => void;
  sendRpc: (method: string, params?: unknown) => string;
  expectGatewayRestart: (
    reason: "heartbeat-model-update" | "config-patch",
  ) => void;
  clearExpectedGatewayRestart: () => void;
  setLeadBoardAgent: (model: string, provider: string) => Promise<void>;
  setAgentModel: (agentId: string, model: string) => void;
  setHeartbeatModel: (model: string) => void;
  setHeartbeatInterval: (intervalMs: number) => void;
  setHeartbeatTimeout: (timeoutMs: number) => void;
  updateConfig: (partial: Partial<GatewayConfig>) => void;
  clearLogs: () => void;
  approveAction: (agentId: string) => void;
  addLog: (entry: LogEntry) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeAgent: (agentId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mkLogId(seq: number) {
  return `log-${Date.now()}-${seq}`;
}

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;
const IDLE_THRESHOLD_MS = 60 * 60 * 1000;

function toMs(ts: number): number {
  return ts < 4_102_444_800 ? ts * 1000 : ts;
}

/** Map raw OpenClaw agent data to our Agent type */
export function mapGatewayAgent(raw: Record<string, unknown>): Agent {
  const agentId = (raw.agentId ?? raw.id ?? raw.name) as string;
  const heartbeat = raw.heartbeat as Record<string, unknown> | undefined;
  const sessions = raw.sessions as { count?: number; recent?: Array<{ age?: number | null; updatedAt?: number | null }> } | undefined;

  const recentSession = sessions?.recent?.[0];
  const sessionAge = recentSession?.age ?? null;

  let status: Agent["status"] = "offline";
  let lastActivityAt = Date.now();

  if (sessionAge !== null) {
    lastActivityAt = Date.now() - sessionAge;
    if (sessionAge < ONLINE_THRESHOLD_MS) status = "online";
    else if (sessionAge < IDLE_THRESHOLD_MS) status = "idle";
  } else if (recentSession?.updatedAt) {
    const age = Date.now() - toMs(recentSession.updatedAt);
    lastActivityAt = Date.now() - age;
    if (age < ONLINE_THRESHOLD_MS) status = "online";
    else if (age < IDLE_THRESHOLD_MS) status = "idle";
  }

  // Override with heartbeat state if available
  if (heartbeat) {
    const state = heartbeat.state as string | undefined;
    if (state === "error") status = "error";
    else if (state === "degraded") status = "degraded";
    else if ((heartbeat.consecutiveFailures as number) > 0) status = "degraded";
  }

  const heartbeatModel = heartbeat ? (heartbeat.model as string) ?? "" : "";

  return {
    id: agentId,
    name: (raw.name as string) ?? agentId,
    role: (raw.isDefault as boolean) ? "Lead Agent" : "Agent",
    status,
    capabilities: [],
    permissions: { read: true, write: true, exec: true, web_search: true, sessions_send: true, sessions_spawn: true },
    sessionCountToday: sessions?.count ?? 0,
    avgResponseMs: 0,
    lastActivityAt,
    heartbeat: heartbeat ? { lastSuccessAt: status !== "offline" ? lastActivityAt : 0, failures: 0, model: heartbeatModel } : undefined,
    model: heartbeatModel || undefined,
    uptime: sessionAge !== null ? Math.floor(sessionAge / 1000) : 0,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  status: "connecting",  // Start as "connecting" (indeterminate) — boot() resolves to connected/disconnected
  latencyMs: 0,
  connectedAt: undefined,
  serverVersion: undefined,
  connId: undefined,
  stateDir: undefined,
  reconnectAttempts: 0,
  reconnectAt: undefined,
  expectedRestartReason: undefined,

  agents: [],
  registeredAgents: [],
  sessions: [],
  logs: [],
  activity: [],

  config: DEFAULT_CONFIG,
  leadBoardAgent: { model: "", provider: "" },
  availableModels: [],
  agentsLoaded: false,
  sessionsLoaded: false,
  modelsLoaded: false,
  heartbeatConfig: DEFAULT_HEARTBEAT_CONFIG,
  heartbeatStats: {
    totalBeats: 0,
    failures: 0,
    lastSuccessAt: 0,
    currentModel: "",
  },
  pendingApprovals: [],

  // Kept for interface compat — never used in new architecture
  _ws: null,
  _pingInterval: null,
  _configHydrated: false,
  _authenticated: false,
  _lastTickAt: 0,
  _logSeq: 0,

  // ─── Config Hydration ───
  // In the new architecture, config comes from backend settings API.
  // We mark as hydrated immediately — GatewayProvider handles the real boot.
  hydrateConfig: async () => {
    // 1. Load localStorage cache for instant display
    let cached: Partial<GatewayConfig> = {};
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("rikuchan:gateway-config");
        if (raw) cached = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    set({ config: { ...DEFAULT_CONFIG, ...cached }, _configHydrated: true });

    // 2. Hydrate from backend (source of truth) — async, non-blocking
    try {
      const settings = await getApiClient().settings.get();
      if (settings) {
        const prefs = settings.preferences as Record<string, unknown> | null;
        const backendConfig: Partial<GatewayConfig> = {};
        if (settings.gatewayUrl) backendConfig.url = settings.gatewayUrl;
        if (prefs?.gatewayToken) backendConfig.token = prefs.gatewayToken as string;
        if (backendConfig.url || backendConfig.token) {
          const merged = { ...DEFAULT_CONFIG, ...cached, ...backendConfig };
          set({ config: merged });
          if (typeof window !== "undefined") {
            localStorage.setItem("rikuchan:gateway-config", JSON.stringify(merged));
          }
        }
      }

    } catch {
      // Backend not reachable — localStorage cache is fine
    }
    // Note: gateway connection status is checked by GatewayProvider.boot()
    // which runs after API client is initialized. Don't check here to avoid races.
  },

  // ─── Connection ───
  // Saves gateway config to backend settings and updates local state.
  // Actual WebSocket to OpenClaw is managed server-side by the backend
  // when a project is activated with this gateway config.
  connect: async (url?: string, token?: string) => {
    const state = get();
    const gatewayUrl = url || state.config.url;
    const gatewayToken = token || state.config.token;

    if (!gatewayUrl) return;

    // Update local config immediately
    const config = { ...state.config, url: gatewayUrl, token: gatewayToken };
    set({ config, status: "connecting" });

    // Persist to localStorage (cache for fast hydration)
    if (typeof window !== "undefined") {
      localStorage.setItem("rikuchan:gateway-config", JSON.stringify(config));
    }

    // Persist gateway URL + token to backend settings (source of truth)
    try {
      await getApiClient().settings.update({
        gatewayUrl,
        preferences: { gatewayToken },
      });
    } catch {
      // apiClient not initialized yet
    }

    // Connect to gateway via backend
    try {
      set({ status: "connecting" });
      await getApiClient().gateway.connect(gatewayUrl, gatewayToken);
      // Fetch agents now that gateway is connected
      const rawAgents = await getApiClient().agents.list();
      const agents = (rawAgents as unknown as Record<string, unknown>[]).map(mapGatewayAgent);
      set({
        status: "connected",
        connectedAt: Date.now(),
        agents,
        registeredAgents: agents,
        agentsLoaded: true,
      });
    } catch {
      // Connection failed — config saved but gateway not reachable
      set({ status: "disconnected", _configHydrated: true });
    }
  },

  disconnect: () => {
    set({ status: "disconnected", connectedAt: undefined, agents: [], registeredAgents: [] });
    try {
      getApiClient().gateway.disconnect().catch(() => {});
    } catch { /* apiClient not initialized */ }
  },

  // ─── Commands (no-op: all actions go through REST API now) ───
  sendCommand: (_command) => {
    console.warn(
      "[gateway-store] sendCommand() is deprecated. Use apiClient methods instead.",
    );
  },

  sendRpc: (_method, _params) => {
    console.warn(
      "[gateway-store] sendRpc() is deprecated. Use apiClient methods instead.",
    );
    return `deprecated-${Date.now()}`;
  },

  // ─── Config Updates ───
  updateConfig: (partial) => {
    set((s) => {
      const config = { ...s.config, ...partial };
      // Persist to localStorage (cache for fast hydration)
      if (typeof window !== "undefined") {
        localStorage.setItem("rikuchan:gateway-config", JSON.stringify(config));
      }
      // Persist to backend (fire-and-forget)
      try {
        getApiClient()
          .settings.update({
            gatewayUrl: config.url,
            preferences: { gatewayToken: config.token },
          })
          .catch(() => {});
      } catch {
        // apiClient not initialized yet
      }
      return { config };
    });
  },

  // ─── Gateway Restart Expectations ───
  expectGatewayRestart: (reason) => set({ expectedRestartReason: reason }),
  clearExpectedGatewayRestart: () => set({ expectedRestartReason: undefined }),

  // ─── Lead Board Agent ───
  setLeadBoardAgent: async (model, provider) => {
    set({ leadBoardAgent: { model, provider } });
    try {
      await getApiClient().settings.update({
        preferences: { leadBoardAgent: { model, provider } },
      });
    } catch (err) {
      console.error("[gateway-store] Failed to save lead board agent:", err);
    }
  },

  // ─── Agent Model (update via settings) ───
  setAgentModel: (agentId, model) => {
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, model } : a,
      ),
    }));
  },

  // ─── Heartbeat Config ───
  setHeartbeatModel: (model) => {
    set((s) => ({
      heartbeatConfig: { ...s.heartbeatConfig, model },
    }));
    try {
      getApiClient()
        .settings.update({
          preferences: { heartbeatModel: model },
        })
        .catch(() => {});
    } catch {
      // not initialized
    }
  },

  setHeartbeatInterval: (intervalMs) => {
    set((s) => ({
      heartbeatConfig: { ...s.heartbeatConfig, intervalMs },
    }));
  },

  setHeartbeatTimeout: (timeoutMs) => {
    set((s) => ({
      heartbeatConfig: { ...s.heartbeatConfig, timeoutMs },
    }));
  },

  // ─── Logs ───
  clearLogs: () => set({ logs: [], _logSeq: 0 }),

  addLog: (entry) => {
    set((s) => ({
      logs: [...s.logs.slice(-499), entry],
      _logSeq: s._logSeq + 1,
    }));
  },

  // ─── Approvals ───
  approveAction: (agentId) => {
    set((s) => ({
      pendingApprovals: s.pendingApprovals.filter(
        (a) => a.agentId !== agentId,
      ),
    }));
    // TODO: call backend approval endpoint when available
  },

  // ─── Agent CRUD (local state — authoritative data from SSE) ───
  updateAgent: (agentId, updates) => {
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, ...updates } : a,
      ),
    }));
  },

  removeAgent: (agentId) => {
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== agentId),
    }));
  },
}));

// ─── Selectors (same as before) ─────────────────────────────────────────────

const selectOnlineAgents = (s: GatewayStore) =>
  s.agents.filter((a) => a.status === "online" || a.status === "thinking");
const selectActiveSessions = (s: GatewayStore) =>
  s.sessions.filter((s) => s.status === "active");
const selectSessionsByAgent = (agentId: string) => (s: GatewayStore) =>
  s.sessions.filter((s) => s.agentId === agentId);

export const useOnlineAgents = () =>
  useGatewayStore(useShallow(selectOnlineAgents));
export const useActiveSessions = () =>
  useGatewayStore(useShallow(selectActiveSessions));
export const useAgentSessions = (agentId: string) =>
  useGatewayStore(useShallow(selectSessionsByAgent(agentId)));

// ─── RPC Response ID tracking (kept for agent-files.ts compat) ───────────────
// These are no-ops in the new architecture since RPC goes through the backend.

const _externalRpcResponseIds = new Set<string>();

export function registerExternalRpcResponseId(id: string) {
  _externalRpcResponseIds.add(id);
}

export function unregisterExternalRpcResponseId(id: string) {
  _externalRpcResponseIds.delete(id);
}
