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
  ActivityType,
  ModelGroup,
} from "./types";
import { gatewayModelsToGroups } from "./models";

const externalRpcResponseIds = new Set<string>();

export function registerExternalRpcResponseId(id: string) {
  externalRpcResponseIds.add(id);
}

export function unregisterExternalRpcResponseId(id: string) {
  externalRpcResponseIds.delete(id);
}

/** Lazy accessor to avoid circular import with projects-store */
function getProjectsStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useProjectsStore } = require("./projects-store") as { useProjectsStore: { getState: () => { tasks: Record<string, Array<{ id: string; sessionId?: string; executionLog?: Array<{ role: string; content: string; timestamp: number }> }>>; updateTask: (projectId: string, taskId: string, updates: Record<string, unknown>) => void; createTask: (projectId: string, task: unknown) => void } } };
  return useProjectsStore.getState();
}

const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  model: "gemini-2.0-flash-exp",
  fallbackChain: ["gemini-2.0-flash-exp", "llama-3.1-8b-instant", "gemini-1.5-flash-8b"],
  intervalMs: 30_000,
  timeoutMs: 5_000,
  maxRetries: 3,
  backoffMultiplier: 2,
};

interface HeartbeatStoreStats {
  totalBeats: number;
  failures: number;
  lastSuccessAt: number;
  currentModel: string;
}

interface GatewayStore {
  status: "connecting" | "connected" | "disconnected" | "error";
  latencyMs: number;
  connectedAt?: number;
  serverVersion?: string;
  connId?: string;
  stateDir?: string;
  reconnectAttempts: number;
  reconnectAt?: number;
  expectedRestartReason?: "heartbeat-model-update";

  agents: Agent[];
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
  pendingApprovals: { agentId: string; agentName: string; action: string; expiresAt: number }[];

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
  expectGatewayRestart: (reason: "heartbeat-model-update") => void;
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadPersistedConfig(): Partial<GatewayConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("rikuchan:gateway-config");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistConfig(config: GatewayConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem("rikuchan:gateway-config", JSON.stringify(config));
}

function mkReqId() {
  return `mc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mkLogId(seq: number) {
  return `log-${Date.now()}-${seq}`;
}

/** Create a log entry and append it to the store */
function pushLog(
  set: (fn: (s: GatewayStore) => Partial<GatewayStore>) => void,
  get: () => GatewayStore,
  level: LogEntry["level"],
  message: string,
  agentId?: string,
) {
  const seq = get()._logSeq + 1;
  const entry: LogEntry = {
    id: mkLogId(seq),
    level,
    message,
    agentId,
    timestamp: Date.now(),
  };
  set((s) => ({
    logs: [...s.logs.slice(-499), entry],
    _logSeq: seq,
  }));
}

/** Create an activity event and prepend it to the store */
function pushActivity(
  set: (fn: (s: GatewayStore) => Partial<GatewayStore>) => void,
  type: ActivityType,
  agentId: string,
  agentName: string,
  message: string,
) {
  const event: ActivityEvent = {
    id: `act-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    type,
    agentId,
    agentName,
    message,
    timestamp: Date.now(),
  };
  set((s) => ({
    activity: [event, ...s.activity].slice(0, 50),
  }));
}

/** Map OpenClaw health agent data to our Agent type */
const ONLINE_THRESHOLD_MS  = 5 * 60 * 1000;   // 5 min — recently active
const IDLE_THRESHOLD_MS    = 30 * 60 * 1000;  // 30 min — still responsive but not active

function resolveAgentStatus(heartbeat: Record<string, unknown> | undefined): Agent["status"] {
  if (!heartbeat) return "offline";

  const state = heartbeat.state as string | undefined;
  if (state === "error") return "error";
  if (state === "degraded") return "degraded";
  if ((heartbeat.consecutiveFailures as number) > 0) return "degraded";

  const lastSuccess = heartbeat.lastSuccessAt as number | null | undefined;
  if (!lastSuccess || lastSuccess <= 0) return "offline";

  const age = Date.now() - lastSuccess;
  if (age < ONLINE_THRESHOLD_MS) return "online";
  if (age < IDLE_THRESHOLD_MS) return "idle";
  return "offline";
}

function healthAgentToAgent(
  ha: Record<string, unknown>,
  identity?: { name?: string; emoji?: string },
): Agent {
  const agentId = ha.agentId as string;
  const heartbeat = ha.heartbeat as Record<string, unknown> | undefined;
  const sessions = ha.sessions as { count?: number; recent?: Array<{ updatedAt?: number | null }> } | undefined;

  let status = resolveAgentStatus(heartbeat);

  // If agent has very recent session activity, consider it online
  const recentSession = sessions?.recent?.[0];
  if (recentSession?.updatedAt && (Date.now() - recentSession.updatedAt) < ONLINE_THRESHOLD_MS) {
    if (status === "idle" || status === "offline") status = "online";
  }

  const lastSuccessAt = (heartbeat?.lastSuccessAt as number) ?? 0;

  return {
    id: agentId,
    name: identity?.name ?? ha.name as string ?? agentId,
    role: (ha.isDefault as boolean) ? "Lead Agent" : "Agent",
    status,
    capabilities: [],
    permissions: { read: true, write: true, exec: true, web_search: true, sessions_send: true, sessions_spawn: true },
    sessionCountToday: sessions?.count ?? 0,
    avgResponseMs: 0,
    lastActivityAt: lastSuccessAt > 0 ? lastSuccessAt : Date.now(),
    heartbeat: heartbeat ? {
      lastSuccessAt,
      failures: (heartbeat.consecutiveFailures as number) ?? 0,
      model: "",
    } : undefined,
    uptime: 0,
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useGatewayStore = create<GatewayStore>((set, get) => ({
  status: "disconnected",
  latencyMs: 0,
  reconnectAttempts: 0,
  agents: [],
  sessions: [],
  logs: [],
  activity: [],
  config: {
    url: "ws://127.0.0.1:18789",
    token: "",
    autoReconnect: false,
    permissionMode: "approve-all",
  },
  _configHydrated: false,
  leadBoardAgent: { model: "claude-sonnet-4-6", provider: "Anthropic" },
  availableModels: [],
  agentsLoaded: false,
  sessionsLoaded: false,
  modelsLoaded: false,
  heartbeatConfig: DEFAULT_HEARTBEAT_CONFIG,
  heartbeatStats: {
    totalBeats: 0,
    failures: 0,
    lastSuccessAt: 0,
    currentModel: DEFAULT_HEARTBEAT_CONFIG.model,
  },
  pendingApprovals: [],
  _ws: null,
  _pingInterval: null,
  _authenticated: false,
  _lastTickAt: 0,
  _logSeq: 0,

  hydrateConfig: () => {
    if (get()._configHydrated) return;
    const persisted = loadPersistedConfig();
    if (persisted.token && persisted.url) {
      // User has saved config — use it
      set((s) => ({ config: { ...s.config, ...persisted }, _configHydrated: true }));
    } else {
      // No saved config — try to auto-detect from openclaw.json
      set({ _configHydrated: true });
      fetch("/api/gateway/config")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.url && data?.token) {
            const autoConfig = { url: data.url, token: data.token };
            set((s) => ({ config: { ...s.config, ...autoConfig } }));
            persistConfig({ ...get().config, ...autoConfig });
          }
        })
        .catch(() => { /* openclaw.json not available */ });
    }
  },

  connect: (url?: string, token?: string) => {
    const { config, _ws, _pingInterval } = get();

    if (_ws) { try { _ws.close(); } catch { /* ignore */ } }
    if (_pingInterval) clearInterval(_pingInterval);

    const finalUrl = url ?? config.url;
    const finalToken = token ?? config.token;

    set({
      status: "connecting",
      connectedAt: undefined,
      _ws: null,
      _authenticated: false,
      agentsLoaded: false,
      sessionsLoaded: false,
      modelsLoaded: false,
    });

    let ws: WebSocket;
    try {
      ws = new WebSocket(finalUrl);
    } catch (err) {
      console.error("[Gateway] Failed to create WebSocket:", err);
      set({ status: "error" });
      return;
    }

    let tcpOpened = false;
    let connectReqId: string | null = null;
    // Track pending RPC callbacks
    const rpcCallbacks = new Map<string, (msg: Record<string, unknown>) => void>();

    ws.onopen = () => {
      tcpOpened = true;
      console.log("[Gateway] TCP connected to", finalUrl);
      set({ _ws: ws });
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const msgType = msg.type as string;

      // ── Challenge-Response Handshake ───────────────────────────────────

      if (msgType === "event" && msg.event === "connect.challenge") {
        const payload = msg.payload as { nonce?: string } | undefined;
        const nonce = payload?.nonce ?? "";
        console.log("[Gateway] Challenge received, nonce:", nonce);

        connectReqId = mkReqId();
        ws.send(JSON.stringify({
          type: "req",
          id: connectReqId,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "openclaw-control-ui",
              version: "1.0.0",
              platform: "web",
              mode: "ui",
            },
            role: "operator",
            scopes: ["operator.read", "operator.admin", "operator.approvals", "operator.pairing"],
            auth: finalToken ? { token: finalToken } : undefined,
          },
        }));
        return;
      }

      // ── Connect response (hello-ok) ───────────────────────────────────

      if (msgType === "res" && connectReqId && msg.id === connectReqId) {
        if (msg.ok) {
          const payload = msg.payload as Record<string, unknown> | undefined;
          const server = payload?.server as { version?: string; connId?: string } | undefined;
          const snapshot = payload?.snapshot as Record<string, unknown> | undefined;
          const policy = payload?.policy as { tickIntervalMs?: number } | undefined;

          console.log("[Gateway] Authenticated! Server:", server?.version, "ConnId:", server?.connId);

          const stateDir = snapshot?.stateDir as string | undefined;

          set({
            status: "connected",
            connectedAt: Date.now(),
            _authenticated: true,
            serverVersion: server?.version,
            connId: server?.connId,
            stateDir,
            reconnectAttempts: 0,
            reconnectAt: undefined,
            expectedRestartReason: undefined,
          });

          // Persist config
          const newConfig = { ...get().config, url: finalUrl, token: finalToken };
          persistConfig(newConfig);
          set({ config: newConfig });

          pushLog(set, get, "INFO", `Connected to gateway v${server?.version ?? "?"} (${server?.connId ?? "?"})`);

          // Extract health snapshot if available
          if (snapshot?.health) {
            handleHealthPayload(snapshot.health as Record<string, unknown>);
          }

          // Request agents list for full details
          const agentsReqId = mkReqId();
          rpcCallbacks.set(agentsReqId, (res) => {
            if (res.ok) {
              const p = res.payload as { agents?: Array<Record<string, unknown>>; defaultId?: string } | undefined;
              if (p?.agents) {
                // Merge identity info into existing agents from health
                set((s) => {
                  const updatedAgents = s.agents.map((agent) => {
                    const match = p.agents!.find((a) => a.id === agent.id);
                    if (match) {
                      const identity = match.identity as { name?: string } | undefined;
                      return { ...agent, name: identity?.name ?? match.name as string ?? agent.name };
                    }
                    return agent;
                  });
                  // Add any agents from the list that weren't in health
                  for (const a of p.agents!) {
                    if (!updatedAgents.find((ua) => ua.id === a.id)) {
                      const identity = a.identity as { name?: string } | undefined;
                      updatedAgents.push({
                        id: a.id as string,
                        name: identity?.name ?? a.name as string ?? a.id as string,
                        role: "Agent",
                        status: "idle",
                        capabilities: [],
                        permissions: { read: true, write: true, exec: true, web_search: true, sessions_send: true, sessions_spawn: true },
                        sessionCountToday: 0,
                        avgResponseMs: 0,
                        lastActivityAt: Date.now(),
                        uptime: 0,
                      });
                    }
                  }
                  return { agents: updatedAgents };
                });
                pushLog(set, get, "INFO", `Loaded ${p.agents.length} agent(s)`);
                set({ agentsLoaded: true });
              } else {
                set({ agentsLoaded: true });
              }
            } else {
              set({ agentsLoaded: true });
            }
          });
          ws.send(JSON.stringify({ type: "req", id: agentsReqId, method: "agents.list", params: {} }));

          // Request available models from gateway
          const modelsReqId = mkReqId();
          rpcCallbacks.set(modelsReqId, (res) => {
            if (res.ok) {
              const p = res.payload as {
                models?: Array<{
                  id: string;
                  name: string;
                  provider: string;
                  contextWindow?: number;
                  reasoning?: boolean;
                  cost?: {
                    input?: number;
                    output?: number;
                    cacheRead?: number;
                    cacheWrite?: number;
                  };
                  freeTier?: boolean;
                }>;
              } | undefined;
              console.log("[Gateway] models.list response:", JSON.stringify(p).slice(0, 500));
              if (p?.models && p.models.length > 0) {
                const groups = gatewayModelsToGroups(p.models);
                set({ availableModels: groups, modelsLoaded: true });
                pushLog(set, get, "INFO", `Loaded ${p.models.length} available model(s)`);
              } else {
                set({ availableModels: [], modelsLoaded: true });
                pushLog(set, get, "WARN", "models.list returned empty list");
              }
            } else {
              set({ availableModels: [], modelsLoaded: true });
              const err = res.error as { message?: string } | undefined;
              console.warn("[Gateway] models.list error:", err);
              pushLog(set, get, "WARN", `models.list failed: ${err?.message ?? "unknown"}`);
            }
          });
          ws.send(JSON.stringify({ type: "req", id: modelsReqId, method: "models.list", params: {} }));

          // Request sessions list
          const sessionsReqId = mkReqId();
          rpcCallbacks.set(sessionsReqId, (res) => {
            if (res.ok) {
              const p = res.payload as { sessions?: Array<{ key: string; updatedAt?: number | null; age?: number | null }> } | undefined;
              if (p?.sessions && p.sessions.length > 0) {
                const mapped = p.sessions.map((s, i) => ({
                  id: s.key,
                  agentId: s.key.split(":")[1] ?? "",
                  agentName: s.key.split(":")[1] ?? "",
                  status: (s.age != null && s.age < 60000 ? "active" : "completed") as "active" | "completed",
                  startedAt: s.updatedAt ? s.updatedAt - (s.age ?? 0) : Date.now(),
                  endedAt: s.updatedAt ?? undefined,
                  messages: [],
                  taskPreview: s.key,
                }));
                set({ sessions: mapped, sessionsLoaded: true });
                pushLog(set, get, "INFO", `Loaded ${mapped.length} session(s)`);
              } else {
                set({ sessions: [], sessionsLoaded: true });
              }
            } else {
              set({ sessions: [], sessionsLoaded: true });
            }
          });
          ws.send(JSON.stringify({ type: "req", id: sessionsReqId, method: "sessions.list", params: {} }));

          // Set up tick monitoring
          if (policy?.tickIntervalMs) {
            set({ _lastTickAt: Date.now() });
          }
        } else {
          const error = msg.error as { code?: string; message?: string } | undefined;
          console.error("[Gateway] Auth rejected:", error?.message ?? error?.code ?? "unknown");
          pushLog(set, get, "ERROR", `Auth rejected: ${error?.message ?? "unknown error"}`);
          set({ status: "error" });
          try { ws.close(); } catch { /* ignore */ }
        }
        return;
      }

      // ── RPC responses ─────────────────────────────────────────────────

      if (msgType === "res") {
        const id = msg.id as string;
        const cb = rpcCallbacks.get(id);
        if (cb) {
          rpcCallbacks.delete(id);
          cb(msg);
        } else if (externalRpcResponseIds.has(id)) {
          externalRpcResponseIds.delete(id);
        } else {
          console.log("[Gateway] Unmatched RPC response:", id, msg.ok ? "ok" : "error", msg.payload ?? msg.error);
        }
        return;
      }

      // ── Events ────────────────────────────────────────────────────────

      if (msgType === "event") {
        const eventName = msg.event as string;
        const payload = msg.payload as Record<string, unknown> | undefined;

        switch (eventName) {
          case "health":
            if (payload) handleHealthPayload(payload);
            break;

          case "agent":
            if (payload) handleAgentEvent(payload);
            break;

          case "heartbeat":
            if (payload) handleHeartbeatEvent(payload);
            break;

          case "tick":
            set({ _lastTickAt: Date.now() });
            break;

          case "shutdown":
            pushLog(set, get, "WARN", "Gateway shutting down");
            break;

          case "em_delegation_decision": {
            if (payload) {
              const ps = getProjectsStore();
              const taskId = payload.taskId as string;
              const projId = payload.projectId as string;
              ps.updateTask(projId, taskId, {
                assignedAgentId: payload.assignedAgentId as string,
                assignedAgentName: payload.assignedAgentName as string,
                emDecisionReason: payload.reason as string,
                emDelegatedAt: Date.now(),
                delegationStatus: "delegated" as const,
                status: "progress" as const,
                startedAt: Date.now(),
              });
              pushLog(set, get, "INFO", `Lead delegated task to ${payload.assignedAgentName}`, payload.assignedAgentId as string);
            }
            break;
          }

          case "session_message": {
            if (payload) {
              const ps = getProjectsStore();
              const sessionId = payload.sessionId as string;
              const message = payload.message as { role: string; content: string; timestamp: number };
              // Find and update the task with this sessionId
              for (const [projId, tasks] of Object.entries(ps.tasks) as [string, Array<{ id: string; sessionId?: string; executionLog?: unknown[] }>][]) {
                const task = tasks.find((t) => t.sessionId === sessionId);
                if (task) {
                  const log = [...((task.executionLog ?? []) as unknown[]), message];
                  ps.updateTask(projId, task.id, { executionLog: log });
                  break;
                }
              }
            }
            break;
          }

          case "subtask_created": {
            if (payload) {
              const ps = getProjectsStore();
              const projId = payload.projectId as string;
              const subtask = payload.subtask as import("./types-project").Task;
              ps.createTask(projId, subtask);
            }
            break;
          }

          default:
            pushLog(set, get, "DEBUG", `Event: ${eventName}`);
        }
        return;
      }
    };

    // ── Event handlers ────────────────────────────────────────────────────

    function handleHealthPayload(payload: Record<string, unknown>) {
      const agents = payload.agents as Array<Record<string, unknown>> | undefined;
      const sessionsInfo = payload.sessions as { count?: number } | undefined;

      if (agents) {
        set((s) => {
          const updated = agents.map((ha) => {
            const existing = s.agents.find((a) => a.id === ha.agentId);
            const mapped = healthAgentToAgent(ha);
            return existing ? { ...existing, ...mapped, name: existing.name || mapped.name } : mapped;
          });
          return { agents: updated };
        });
      }

      const ok = payload.ok as boolean | undefined;
      pushLog(set, get, ok ? "INFO" : "WARN",
        `Health: ${ok ? "OK" : "degraded"} — ${agents?.length ?? 0} agents, ${sessionsInfo?.count ?? 0} sessions`
      );
    }

    function handleAgentEvent(payload: Record<string, unknown>) {
      const runId = payload.runId as string;
      const stream = payload.stream as string;
      const data = payload.data as Record<string, unknown> | undefined;
      const sessionKey = payload.sessionKey as string | undefined;
      const ts = payload.ts as number ?? Date.now();

      // Extract agent id from sessionKey: "agent:<agentId>:<sessionName>"
      let agentId = "";
      let agentName = "";
      if (sessionKey) {
        const parts = sessionKey.split(":");
        if (parts.length >= 2) {
          agentId = parts[1];
          const agent = get().agents.find((a) => a.id === agentId);
          agentName = agent?.name ?? agentId;
        }
      }

      // ── Route to task execution log if sessionKey matches a task ────
      if (sessionKey) {
        try {
          const ps = getProjectsStore();
          for (const [projId, tasks] of Object.entries(ps.tasks) as [string, Array<{ id: string; sessionId?: string; executionLog?: Array<{ role: string; content: string; timestamp: number }> }>][]) {
            const task = tasks.find((t) => {
              if (!t.sessionId) return false;
              // Exact match
              if (t.sessionId === sessionKey) return true;
              // Match by agentId — handle prefixed IDs (e.g. "sempreit-tech-recruiter" vs "techrecruiter")
              const taskAgentId = t.sessionId.split(":")[1] ?? "";
              const eventAgentId = sessionKey.split(":")[1] ?? "";
              if (!taskAgentId || !eventAgentId) return false;
              // Either contains the other, or they share a suffix
              return eventAgentId.includes(taskAgentId) ||
                     taskAgentId.includes(eventAgentId) ||
                     eventAgentId.endsWith(taskAgentId) ||
                     taskAgentId.endsWith(eventAgentId);
            });
            if (task) {
              const log = [...(task.executionLog ?? [])];
              const updates: Record<string, unknown> = {};

              if (stream === "assistant" && data) {
                const delta = (data.delta as string) ?? (data.text as string) ?? "";
                if (delta) {
                  // Accumulate deltas into the last assistant message instead of creating new entries
                  const lastMsg = log[log.length - 1];
                  if (lastMsg && lastMsg.role === "assistant") {
                    lastMsg.content += delta;
                    lastMsg.timestamp = ts;
                  } else {
                    log.push({ role: "assistant", content: delta, timestamp: ts });
                  }
                  updates.executionLog = log;
                }
              } else if (stream === "error" && data) {
                const errMsg = (data.error as string) ?? (data.message as string) ?? "Error occurred";
                log.push({ role: "system", content: errMsg, timestamp: ts });
                updates.executionLog = log;
              } else if (stream === "tool" && data) {
                const toolName = (data.toolName as string) ?? "unknown";
                log.push({ role: "tool", content: `Tool: ${toolName}`, timestamp: ts });
                updates.executionLog = log;
              } else if (stream === "lifecycle" && data) {
                const phase = (data.phase as string);
                if (phase === "end") {
                  // Check accumulated log for block signals
                  const fullText = log
                    .filter((m) => m.role === "assistant")
                    .map((m) => m.content)
                    .join("");
                  const wasBlocked =
                    fullText.includes("BLOCKED:") ||
                    fullText.includes("Blocked") ||
                    fullText.includes("Missing Data");

                  if (wasBlocked) {
                    updates.status = "blocked";
                    updates.updatedAt = ts;
                    log.push({ role: "system", content: "Task blocked — agent reported missing data or access issues", timestamp: ts });
                    // Trigger auto-resolution
                    const capturedTaskId = task.id;
                    const capturedProjId = projId;
                    setTimeout(() => {
                      try {
                        const { handleTaskBlocked } = require("./auto-resolve") as { handleTaskBlocked: (taskId: string, projectId: string) => void };
                        handleTaskBlocked(capturedTaskId, capturedProjId);
                      } catch { /* auto-resolve not loaded */ }
                    }, 2000);
                  } else {
                    updates.status = "done";
                    updates.completedAt = ts;
                    updates.updatedAt = ts;
                    log.push({ role: "system", content: "Task completed", timestamp: ts });
                    // Push notification
                    try {
                      const { useNotificationsStore } = require("./notifications-store") as { useNotificationsStore: { getState: () => { push: (n: { type: string; title: string; message: string; taskId?: string }) => void } } };
                      useNotificationsStore.getState().push({ type: "success", title: "Task Completed", message: `Task finished successfully`, taskId: task.id });
                    } catch { /* ignore */ }
                  }
                  updates.executionLog = log;
                } else if (phase === "error") {
                  log.push({ role: "system", content: "Execution error", timestamp: ts });
                  updates.executionLog = log;
                }
              }

              if (Object.keys(updates).length > 0) {
                // Auto-detect blocked from accumulated assistant text
                if (updates.executionLog) {
                  const fullAssistant = (updates.executionLog as Array<{ role: string; content: string }>)
                    .filter((m) => m.role === "assistant")
                    .map((m) => m.content)
                    .join("");
                  if (
                    fullAssistant.includes("BLOCKED:") ||
                    fullAssistant.includes("Status: ⚠️ Blocked")
                  ) {
                    updates.status = "blocked";
                    updates.updatedAt = ts;
                    pushLog(set, get, "WARN", `Task auto-blocked by agent response`);

                    // Push notification
                    try {
                      const { useNotificationsStore } = require("./notifications-store") as { useNotificationsStore: { getState: () => { push: (n: { type: string; title: string; message: string; taskId?: string }) => void } } };
                      useNotificationsStore.getState().push({ type: "warning", title: "Task Blocked", message: `Agent reported an issue`, taskId: task.id });
                    } catch { /* ignore */ }

                    // Trigger auto-resolution
                    setTimeout(() => {
                      try {
                        const { handleTaskBlocked } = require("./auto-resolve") as { handleTaskBlocked: (taskId: string, projectId: string) => void };
                        handleTaskBlocked(task.id, projId);
                      } catch { /* auto-resolve not loaded */ }
                    }, 2000); // Small delay to let the store update settle
                  }
                }

                ps.updateTask(projId, task.id, updates);
              }
              break;
            }
          }
        } catch { /* projects-store not loaded yet */ }
      }

      switch (stream) {
        case "lifecycle": {
          const phase = data?.phase as string | undefined;

          if (phase === "start") {
            // Agent started processing
            if (agentId) {
              set((s) => ({
                agents: s.agents.map((a) =>
                  a.id === agentId ? { ...a, status: "thinking" as const, lastActivityAt: ts } : a
                ),
              }));
            }
            pushLog(set, get, "INFO", `Agent run started (${runId.slice(0, 8)})`, agentId);
            if (agentId) pushActivity(set, "session_started", agentId, agentName, "Started processing");
          } else if (phase === "end") {
            // Agent finished
            if (agentId) {
              set((s) => ({
                agents: s.agents.map((a) =>
                  a.id === agentId ? { ...a, status: "online" as const, lastActivityAt: ts } : a
                ),
              }));
            }
            pushLog(set, get, "INFO", `Agent run completed (${runId.slice(0, 8)})`, agentId);
            if (agentId) pushActivity(set, "session_completed", agentId, agentName, "Completed processing");
          } else if (phase === "error") {
            if (agentId) {
              set((s) => ({
                agents: s.agents.map((a) =>
                  a.id === agentId ? { ...a, status: "error" as const, lastActivityAt: ts } : a
                ),
              }));
            }
            pushLog(set, get, "ERROR", `Agent run error (${runId.slice(0, 8)})`, agentId);
            if (agentId) pushActivity(set, "session_error", agentId, agentName, "Run error");
          } else if (phase) {
            pushLog(set, get, "DEBUG", `Agent ${phase} (${runId.slice(0, 8)})`, agentId);
          }
          break;
        }

        case "assistant": {
          // LLM response stream — update agent to thinking status
          if (agentId) {
            set((s) => ({
              agents: s.agents.map((a) =>
                a.id === agentId ? { ...a, status: "thinking" as const, lastActivityAt: ts } : a
              ),
            }));
          }
          break;
        }

        case "error": {
          const errorData = data?.error as string ?? data?.message as string ?? "Unknown error";
          pushLog(set, get, "ERROR", `Agent error: ${errorData}`, agentId);
          break;
        }

        case "tool": {
          const toolName = data?.toolName as string ?? "unknown tool";
          pushLog(set, get, "DEBUG", `Tool call: ${toolName}`, agentId);
          break;
        }

        default:
          pushLog(set, get, "DEBUG", `Agent stream "${stream}" (${runId.slice(0, 8)})`, agentId);
      }
    }

    function handleHeartbeatEvent(payload: Record<string, unknown>) {
      const status = payload.status as string ?? "unknown";
      const durationMs = payload.durationMs as number ?? 0;

      set((s) => ({
        heartbeatStats: {
          totalBeats: s.heartbeatStats.totalBeats + 1,
          failures: status.startsWith("ok") ? 0 : s.heartbeatStats.failures + 1,
          lastSuccessAt: status.startsWith("ok") ? Date.now() : s.heartbeatStats.lastSuccessAt,
          currentModel: s.heartbeatStats.currentModel,
        },
      }));

      if (!status.startsWith("ok")) {
        pushLog(set, get, "WARN", `Heartbeat ${status} (${durationMs}ms)`);
      } else {
        pushLog(set, get, "DEBUG", `Heartbeat OK (${durationMs}ms)`);
      }
    }

    // ── Connection lifecycle ──────────────────────────────────────────────

    ws.onclose = (event) => {
      const { _pingInterval: pi, config: cfg, _authenticated: wasAuthed } = get();
      if (pi) clearInterval(pi);

      console.warn(`[Gateway] Closed (code: ${event.code}, reason: "${event.reason}")`);

      if (wasAuthed) {
        const shouldReconnect = cfg.autoReconnect || Boolean(get().expectedRestartReason);
        const nextAttempt = get().reconnectAttempts + 1;
        const delayMs = Math.min(2_000 * (2 ** Math.max(0, nextAttempt - 1)), 60_000);

        set({
          status: "disconnected",
          _ws: null,
          _pingInterval: null,
          _authenticated: false,
          agentsLoaded: false,
          sessionsLoaded: false,
          modelsLoaded: false,
          reconnectAttempts: shouldReconnect ? nextAttempt : 0,
          reconnectAt: shouldReconnect ? Date.now() + delayMs : undefined,
        });
        pushLog(set, get, "WARN", `Disconnected (code: ${event.code})`);

        if (shouldReconnect) {
          console.log(`[Gateway] Auto-reconnecting in ${Math.round(delayMs / 1000)}s...`);
          pushLog(set, get, "INFO", `Auto-reconnecting in ${Math.round(delayMs / 1000)}s...`);
          setTimeout(() => {
            if (get().status === "disconnected") get().connect();
          }, delayMs);
        }
      } else {
        set({ status: "error", _ws: null, _pingInterval: null });
      }
    };

    ws.onerror = (event) => {
      console.error("[Gateway] WebSocket error:", event);
    };
  },

  disconnect: () => {
    const { _ws, _pingInterval } = get();
    if (_pingInterval) clearInterval(_pingInterval);
    if (_ws) { try { _ws.close(); } catch { /* ignore */ } }
    pushLog(set, get, "INFO", "Disconnected by user");
    set({
      status: "disconnected",
      _ws: null,
      _pingInterval: null,
      _authenticated: false,
      connectedAt: undefined,
      reconnectAttempts: 0,
      reconnectAt: undefined,
      expectedRestartReason: undefined,
      agents: [],
      sessions: [],
      availableModels: [],
      agentsLoaded: false,
      sessionsLoaded: false,
      modelsLoaded: false,
    });
  },

  sendCommand: (command: GatewayCommand) => {
    const { _ws } = get();
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(command));
    }
  },

  sendRpc: (method: string, params?: unknown) => {
    const { _ws } = get();
    const id = mkReqId();
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ type: "req", id, method, params: params ?? {} }));
    }
    return id;
  },

  expectGatewayRestart: (reason) => {
    set({ expectedRestartReason: reason, reconnectAttempts: 0, reconnectAt: undefined });
  },

  clearExpectedGatewayRestart: () => {
    set({ expectedRestartReason: undefined, reconnectAttempts: 0, reconnectAt: undefined });
  },

  setLeadBoardAgent: async (model: string, provider: string) => {
    set({ leadBoardAgent: { model, provider } });
    if (typeof window !== "undefined") {
      localStorage.setItem("rikuchan:lead-agent", JSON.stringify({ model, provider }));
    }
  },

  setAgentModel: (agentId: string, model: string) => {
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, model } : a
      ),
    }));
  },

  setHeartbeatModel: (model: string) => {
    set((s) => ({ heartbeatConfig: { ...s.heartbeatConfig, model } }));
    if (typeof window !== "undefined") {
      localStorage.setItem("rikuchan:heartbeat-model", model);
    }
  },

  setHeartbeatInterval: (intervalMs: number) => {
    set((s) => ({ heartbeatConfig: { ...s.heartbeatConfig, intervalMs } }));
  },

  setHeartbeatTimeout: (timeoutMs: number) => {
    set((s) => ({ heartbeatConfig: { ...s.heartbeatConfig, timeoutMs } }));
  },

  updateConfig: (partial: Partial<GatewayConfig>) => {
    const newConfig = { ...get().config, ...partial };
    persistConfig(newConfig);
    set({ config: newConfig });
  },

  clearLogs: () => set({ logs: [] }),

  approveAction: (agentId: string) => {
    set((s) => ({
      pendingApprovals: s.pendingApprovals.filter((p) => p.agentId !== agentId),
    }));
    get().sendCommand({ type: "agent_action", agentId, action: "restart" });
  },

  addLog: (entry: LogEntry) => {
    set((s) => ({ logs: [...s.logs.slice(-499), entry] }));
  },

  updateAgent: (agentId: string, updates: Partial<Agent>) => {
    set((s) => ({
      agents: s.agents.map((a) => (a.id === agentId ? { ...a, ...updates } : a)),
    }));
  },
}));

// ─── Derived selectors ──────────────────────────────────────────────────────

export const selectCompletedToday = (s: GatewayStore) =>
  s.sessions.filter((sess) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sess.status === "completed" && sess.endedAt && sess.endedAt >= today.getTime();
  }).length;

export const selectErrorRate = (s: GatewayStore) => {
  const total = s.sessions.length;
  if (total === 0) return 0;
  const errors = s.sessions.filter((sess) => sess.status === "error").length;
  return Math.round((errors / total) * 100);
};

export const selectAgentById = (id: string) => (s: GatewayStore) =>
  s.agents.find((a) => a.id === id);

export const selectSessionById = (id: string) => (s: GatewayStore) =>
  s.sessions.find((s) => s.id === id);

export const selectOnlineAgents = (s: GatewayStore) =>
  s.agents.filter((a) => a.status === "online" || a.status === "thinking");

export const selectActiveSessions = (s: GatewayStore) =>
  s.sessions.filter((sess) => sess.status === "active");

export const selectSessionsByAgent = (agentId: string) => (s: GatewayStore) =>
  s.sessions.filter((sess) => sess.agentId === agentId);

export const useOnlineAgents = () =>
  useGatewayStore(useShallow(selectOnlineAgents));

export const useActiveSessions = () =>
  useGatewayStore(useShallow(selectActiveSessions));

export const useSessionsByAgent = (agentId: string) =>
  useGatewayStore(useShallow(selectSessionsByAgent(agentId)));
