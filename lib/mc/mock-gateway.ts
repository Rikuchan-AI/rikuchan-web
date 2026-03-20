"use client";

import type {
  Agent,
  Session,
  LogEntry,
  Message,
  ActivityEvent,
} from "./types";

// ─── Mock Agents ──────────────────────────────────────────────────────────────

export const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-001",
    name: "Architect",
    role: "System Designer",
    status: "online",
    capabilities: ["system design", "ADR writing", "tech planning"],
    permissions: {
      read: true,
      write: true,
      exec: false,
      web_search: true,
      sessions_send: true,
      sessions_spawn: true,
    },
    currentSessionId: "sess-001",
    currentTask: "Designing microservice architecture for payment module",
    sessionCountToday: 12,
    avgResponseMs: 3200,
    lastActivityAt: Date.now() - 45 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 28 * 1000, failures: 0, model: "gemini-2.0-flash-exp" },
    uptime: 3600 * 1000 * 6,
  },
  {
    id: "agent-002",
    name: "Researcher",
    role: "Knowledge Agent",
    status: "thinking",
    capabilities: ["web search", "summarization", "fact checking"],
    permissions: {
      read: true,
      write: false,
      exec: false,
      web_search: true,
      sessions_send: true,
      sessions_spawn: false,
    },
    currentSessionId: "sess-002",
    currentTask: "Researching competitors for Q2 strategy report",
    sessionCountToday: 8,
    avgResponseMs: 5100,
    lastActivityAt: Date.now() - 12 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 18 * 1000, failures: 0, model: "gemini-2.0-flash-exp" },
    uptime: 3600 * 1000 * 4,
  },
  {
    id: "agent-003",
    name: "Developer",
    role: "Code Generator",
    status: "idle",
    capabilities: ["code generation", "debugging", "refactoring", "testing"],
    permissions: {
      read: true,
      write: true,
      exec: true,
      web_search: true,
      sessions_send: true,
      sessions_spawn: true,
    },
    sessionCountToday: 23,
    avgResponseMs: 2800,
    lastActivityAt: Date.now() - 5 * 60 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 22 * 1000, failures: 0, model: "llama-3.1-8b-instant" },
    uptime: 3600 * 1000 * 12,
  },
  {
    id: "agent-004",
    name: "Recruiter",
    role: "HR Specialist",
    status: "online",
    capabilities: ["candidate screening", "jd writing", "interview scheduling"],
    permissions: {
      read: true,
      write: true,
      exec: false,
      web_search: true,
      sessions_send: true,
      sessions_spawn: false,
    },
    currentSessionId: "sess-003",
    currentTask: "Screening 42 Flutter developer applications",
    sessionCountToday: 5,
    avgResponseMs: 4200,
    lastActivityAt: Date.now() - 90 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 15 * 1000, failures: 0, model: "gemini-2.0-flash-exp" },
    uptime: 3600 * 1000 * 3,
  },
  {
    id: "agent-005",
    name: "Analyst",
    role: "Data Analyst",
    status: "degraded",
    capabilities: ["data analysis", "SQL", "reporting", "visualization"],
    permissions: {
      read: true,
      write: false,
      exec: true,
      web_search: false,
      sessions_send: false,
      sessions_spawn: false,
    },
    sessionCountToday: 3,
    avgResponseMs: 6800,
    lastActivityAt: Date.now() - 15 * 60 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 4 * 60 * 1000, failures: 3, model: "gemini-2.0-flash-exp" },
    uptime: 3600 * 1000 * 8,
  },
  {
    id: "agent-006",
    name: "QA Tester",
    role: "Quality Assurance",
    status: "error",
    capabilities: ["test writing", "bug reporting", "regression testing"],
    permissions: {
      read: true,
      write: true,
      exec: true,
      web_search: false,
      sessions_send: true,
      sessions_spawn: false,
    },
    sessionCountToday: 7,
    avgResponseMs: 3500,
    lastActivityAt: Date.now() - 2 * 60 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 6 * 60 * 1000, failures: 3, model: "gemini-1.5-flash-8b" },
    uptime: 3600 * 1000 * 2,
  },
  {
    id: "agent-007",
    name: "Writer",
    role: "Content Specialist",
    status: "offline",
    capabilities: ["copywriting", "documentation", "blog posts"],
    permissions: {
      read: true,
      write: true,
      exec: false,
      web_search: true,
      sessions_send: false,
      sessions_spawn: false,
    },
    sessionCountToday: 0,
    avgResponseMs: 0,
    lastActivityAt: Date.now() - 24 * 3600 * 1000,
    uptime: 0,
  },
  {
    id: "agent-008",
    name: "DevOps",
    role: "Infrastructure Agent",
    status: "idle",
    capabilities: ["CI/CD", "Docker", "Kubernetes", "monitoring"],
    permissions: {
      read: true,
      write: true,
      exec: true,
      web_search: true,
      sessions_send: true,
      sessions_spawn: true,
    },
    sessionCountToday: 4,
    avgResponseMs: 2100,
    lastActivityAt: Date.now() - 20 * 60 * 1000,
    heartbeat: { lastSuccessAt: Date.now() - 8 * 1000, failures: 0, model: "gemini-2.0-flash-exp" },
    uptime: 3600 * 1000 * 18,
  },
];

// ─── Mock Messages ─────────────────────────────────────────────────────────────

const mockMessages: Message[] = [
  {
    id: "msg-001",
    role: "system",
    content: "You are Architect, a system design specialist. Help design scalable and maintainable architectures.",
    timestamp: Date.now() - 10 * 60 * 1000,
  },
  {
    id: "msg-002",
    role: "user",
    content: "Design a microservice architecture for a payment processing module that handles 10k TPS.",
    timestamp: Date.now() - 9 * 60 * 1000,
  },
  {
    id: "msg-003",
    role: "assistant",
    content: "I'll design a robust payment processing architecture. Let me start by outlining the core services...\n\n**Core Services:**\n1. **Payment Gateway Service** — Entry point for all payment requests\n2. **Transaction Ledger** — Immutable event store (Kafka + PostgreSQL)\n3. **Risk Engine** — Real-time fraud detection (< 50ms SLA)\n4. **Settlement Service** — Async reconciliation with banks",
    timestamp: Date.now() - 8 * 60 * 1000,
  },
  {
    id: "msg-004",
    role: "tool",
    content: "web_search",
    toolName: "web_search",
    toolInput: { query: "payment processing microservice patterns 2024" },
    toolOutput: { results: ["Stripe architecture blog", "AWS payment processing whitepaper"] },
    timestamp: Date.now() - 7 * 60 * 1000,
  },
  {
    id: "msg-005",
    role: "assistant",
    content: "Based on industry patterns and my research, here's the recommended architecture with event sourcing...",
    timestamp: Date.now() - 6 * 60 * 1000,
    tokens: 842,
  },
];

// ─── Mock Sessions ─────────────────────────────────────────────────────────────

export const MOCK_SESSIONS: Session[] = [
  {
    id: "sess-001",
    agentId: "agent-001",
    agentName: "Architect",
    status: "active",
    startedAt: Date.now() - 10 * 60 * 1000,
    messages: mockMessages,
    taskPreview: "Designing microservice architecture for payment module",
    tokensUsed: 3420,
  },
  {
    id: "sess-002",
    agentId: "agent-002",
    agentName: "Researcher",
    status: "active",
    startedAt: Date.now() - 25 * 60 * 1000,
    messages: [
      {
        id: "msg-r-001",
        role: "user",
        content: "Research top 5 competitors for our B2B SaaS product in Q2 strategy",
        timestamp: Date.now() - 25 * 60 * 1000,
      },
      {
        id: "msg-r-002",
        role: "assistant",
        content: "Starting competitor analysis. Searching for relevant market data...",
        timestamp: Date.now() - 24 * 60 * 1000,
      },
    ],
    taskPreview: "Researching competitors for Q2 strategy report",
    tokensUsed: 1240,
  },
  {
    id: "sess-003",
    agentId: "agent-004",
    agentName: "Recruiter",
    status: "active",
    startedAt: Date.now() - 45 * 60 * 1000,
    messages: [
      {
        id: "msg-hr-001",
        role: "user",
        content: "Screen the 42 Flutter developer applications we received this week",
        timestamp: Date.now() - 45 * 60 * 1000,
      },
    ],
    taskPreview: "Screening 42 Flutter developer applications",
    tokensUsed: 8930,
  },
  {
    id: "sess-004",
    agentId: "agent-003",
    agentName: "Developer",
    status: "completed",
    startedAt: Date.now() - 3 * 3600 * 1000,
    endedAt: Date.now() - 2 * 3600 * 1000,
    messages: [],
    taskPreview: "Implement auth middleware for Next.js API routes",
    tokensUsed: 12400,
  },
  {
    id: "sess-005",
    agentId: "agent-006",
    agentName: "QA Tester",
    status: "error",
    startedAt: Date.now() - 2 * 60 * 1000,
    endedAt: Date.now() - 1 * 60 * 1000,
    messages: [],
    taskPreview: "Run regression tests on payment module",
    errorCause: "Execution timeout: test suite exceeded 300s limit",
  },
];

// ─── Mock Logs ────────────────────────────────────────────────────────────────

export const MOCK_LOGS: LogEntry[] = [
  { id: "log-001", level: "INFO", message: "Gateway started on ws://127.0.0.1:18789", timestamp: Date.now() - 6 * 3600 * 1000 },
  { id: "log-002", level: "INFO", message: "Agent agent-001 (Architect) connected", agentId: "agent-001", timestamp: Date.now() - 6 * 3600 * 1000 + 100 },
  { id: "log-003", level: "INFO", message: "Agent agent-002 (Researcher) connected", agentId: "agent-002", timestamp: Date.now() - 4 * 3600 * 1000 },
  { id: "log-004", level: "WARN", message: "Heartbeat failure #1 for agent-005 (Analyst)", agentId: "agent-005", timestamp: Date.now() - 30 * 60 * 1000 },
  { id: "log-005", level: "ERROR", message: "Session sess-005 terminated: execution timeout", agentId: "agent-006", timestamp: Date.now() - 1 * 60 * 1000 },
  { id: "log-006", level: "DEBUG", message: "WebSocket ping/pong: 12ms", timestamp: Date.now() - 30 * 1000 },
  { id: "log-007", level: "INFO", message: "Session sess-001 started for agent-001", agentId: "agent-001", timestamp: Date.now() - 10 * 60 * 1000 },
  { id: "log-008", level: "WARN", message: "Heartbeat failure #2 for agent-005 (Analyst)", agentId: "agent-005", timestamp: Date.now() - 18 * 60 * 1000 },
  { id: "log-009", level: "ERROR", message: "Heartbeat failure #3 for agent-005 — status set to DEGRADED", agentId: "agent-005", timestamp: Date.now() - 10 * 60 * 1000 },
  { id: "log-010", level: "INFO", message: "Lead board agent model changed to claude-sonnet-4-5", timestamp: Date.now() - 5 * 60 * 1000 },
];

// ─── Mock Activity Feed ───────────────────────────────────────────────────────

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "act-001", type: "session_started", agentId: "agent-001", agentName: "Architect", message: "Started session: designing payment microservices", timestamp: Date.now() - 10 * 60 * 1000 },
  { id: "act-002", type: "session_error", agentId: "agent-006", agentName: "QA Tester", message: "Session failed: execution timeout", timestamp: Date.now() - 1 * 60 * 1000 },
  { id: "act-003", type: "heartbeat_failed", agentId: "agent-005", agentName: "Analyst", message: "Heartbeat failed 3x — agent degraded", timestamp: Date.now() - 10 * 60 * 1000 },
  { id: "act-004", type: "agent_online", agentId: "agent-004", agentName: "Recruiter", message: "Agent came online", timestamp: Date.now() - 45 * 60 * 1000 },
  { id: "act-005", type: "session_completed", agentId: "agent-003", agentName: "Developer", message: "Session completed: auth middleware", timestamp: Date.now() - 2 * 3600 * 1000 },
];

// ─── Simulated WebSocket ───────────────────────────────────────────────────────

export function createMockWebSocket() {
  let listeners: ((data: unknown) => void)[] = [];
  let interval: ReturnType<typeof setInterval> | null = null;

  const send = (data: unknown) => {
    console.log("[MockGateway] Command received:", data);
  };

  const on = (cb: (data: unknown) => void) => {
    listeners.push(cb);
    return () => { listeners = listeners.filter((l) => l !== cb); };
  };

  const emit = (data: unknown) => {
    listeners.forEach((l) => l(data));
  };

  const start = () => {
    // Initial state is set directly in the store via set({ agents, sessions, logs })
    // Only emit live updates here to avoid duplicating IDs

    // Simulate live updates
    interval = setInterval(() => {
      const updates = [
        () => emit({ type: "log_entry", entry: { id: `log-${Date.now()}`, level: "DEBUG", message: `WebSocket ping/pong: ${10 + Math.floor(Math.random() * 10)}ms`, timestamp: Date.now() } }),
        () => emit({ type: "heartbeat_result", agentId: "agent-001", ok: true, model: "gemini-2.0-flash-exp", latencyMs: 180 + Math.floor(Math.random() * 60) }),
        () => emit({ type: "log_entry", entry: { id: `log-${Date.now()}`, level: "INFO", message: "Session token refreshed", agentId: "agent-001", timestamp: Date.now() } }),
      ];
      const pick = updates[Math.floor(Math.random() * updates.length)];
      pick();
    }, 3000);
  };

  const stop = () => {
    if (interval) { clearInterval(interval); interval = null; }
    listeners = [];
  };

  return { send, on, start, stop };
}
