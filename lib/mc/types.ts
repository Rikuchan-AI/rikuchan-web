// ─── Agent Types ──────────────────────────────────────────────────────────────

export type AgentStatus =
  | "online"
  | "idle"
  | "thinking"
  | "error"
  | "offline"
  | "degraded";

export interface AgentPermissions {
  read: boolean;
  write: boolean;
  exec: boolean;
  web_search: boolean;
  sessions_send: boolean;
  sessions_spawn: boolean;
}

export interface HeartbeatStats {
  lastSuccessAt: number;
  failures: number;
  model: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  capabilities: string[];
  permissions: AgentPermissions;
  currentSessionId?: string;
  currentTask?: string;
  sessionCountToday: number;
  avgResponseMs: number;
  lastActivityAt: number;
  heartbeat?: HeartbeatStats;
  model?: string;
  uptime: number;
}

// ─── Session Types ─────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "tool" | "system";
export type SessionStatus = "active" | "completed" | "error" | "idle";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  tokens?: number;
}

export interface Session {
  id: string;
  agentId: string;
  agentName: string;
  status: SessionStatus;
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  taskPreview: string;
  tokensUsed?: number;
  errorCause?: string;
}

// ─── Log Types ────────────────────────────────────────────────────────────────

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  agentId?: string;
  timestamp: number;
}

// ─── Gateway Config ───────────────────────────────────────────────────────────

export interface GatewayConfig {
  url: string;
  token: string;
  autoReconnect: boolean;
  permissionMode: "allow-all" | "approve-all" | "custom";
}

export interface SavedGateway {
  id: string;
  name: string;
  url: string;
  token: string;
}

// ─── Heartbeat Types ──────────────────────────────────────────────────────────

export interface HeartbeatConfig {
  model: string;
  fallbackChain: string[];
  intervalMs: number;
  timeoutMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

export interface HeartbeatPayload {
  agentId: string;
  status: "alive" | "degraded";
  sessionCount: number;
  timestamp: number;
  uptimeMs: number;
}

// ─── WebSocket Messages ───────────────────────────────────────────────────────

export type GatewayMessage =
  | { type: "pong"; timestamp: number }
  | { type: "agent_status"; agentId: string; status: AgentStatus }
  | { type: "agent_list"; agents: Agent[] }
  | { type: "session_update"; session: Session }
  | { type: "session_list"; sessions: Session[] }
  | { type: "log_entry"; entry: LogEntry }
  | { type: "config_ack"; key: string; value: unknown }
  | {
      type: "heartbeat_result";
      agentId: string;
      ok: boolean;
      model: string;
      latencyMs: number;
    };

export type GatewayCommand =
  | { type: "subscribe_agents" }
  | { type: "subscribe_sessions"; agentId?: string }
  | { type: "set_config"; key: string; value: unknown }
  | { type: "agent_action"; agentId: string; action: "idle" | "restart" }
  | { type: "heartbeat"; agentId: string; model: string; payload: HeartbeatPayload };

// ─── Model Config ─────────────────────────────────────────────────────────────

export interface ModelOption {
  id: string;
  label: string;
  provider?: string;
  inputCost?: number;
  outputCost?: number;
  recommended?: boolean;
  contextWindow?: number;
  rateLimit?: string;
  note?: string;
  freeTier?: boolean;
}

export interface ModelGroup {
  provider: string;
  models: ModelOption[];
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export type ActivityType =
  | "agent_online"
  | "agent_offline"
  | "session_started"
  | "session_completed"
  | "session_error"
  | "heartbeat_failed"
  | "approval_required";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  agentId: string;
  agentName: string;
  message: string;
  timestamp: number;
}
