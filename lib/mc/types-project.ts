// ─── Project Types ──────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "paused" | "archived";
export type OperationMode = "manual" | "supervised" | "autonomous";

export type GroupColor =
  | "emerald"
  | "blue"
  | "purple"
  | "amber"
  | "coral"
  | "pink"
  | "teal"
  | "gray";

export const GROUP_COLORS: { value: GroupColor; label: string; tw: string }[] = [
  { value: "emerald", label: "Emerald", tw: "bg-emerald-500" },
  { value: "blue",    label: "Blue",    tw: "bg-blue-500" },
  { value: "purple",  label: "Purple",  tw: "bg-purple-500" },
  { value: "amber",   label: "Amber",   tw: "bg-amber-500" },
  { value: "coral",   label: "Coral",   tw: "bg-orange-500" },
  { value: "pink",    label: "Pink",    tw: "bg-pink-500" },
  { value: "teal",    label: "Teal",    tw: "bg-teal-500" },
  { value: "gray",    label: "Gray",    tw: "bg-zinc-500" },
];

export function colorFromName(name: string): GroupColor {
  const colors: GroupColor[] = ["emerald", "blue", "purple", "amber", "coral", "pink", "teal", "gray"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export interface BoardGroupGatewayConfig {
  url: string;
  token?: string;
}

export interface BoardGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;   // emoji or lucide icon name
  color?: GroupColor;
  gateway?: BoardGroupGatewayConfig;
  agentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectModelConfig {
  preferred: string;
  forced: boolean;
  fallback?: string;
}

export interface ProjectHeartbeatConfig {
  intervalSeconds: number;
  degradedThreshold: number;
  offlineThreshold: number;
  autoReassign: boolean;
}

export interface SpawnPermission {
  sourceAgentId: string;
  targetAgentId: string;
  maxConcurrent: number;
  requireApproval: boolean;
}

export interface ProjectNotificationConfig {
  taskBlocked: boolean;
  agentOffline: boolean;
  sprintComplete: boolean;
  approvalPending: boolean;
  channels: ("telegram" | "dashboard")[];
}

export interface TokenBudgetConfig {
  monthlyLimit: number;         // USD
  alertAt80: boolean;
  alertAt90: boolean;
  autoPauseAt100: boolean;
  currentMonthSpend?: number;   // populated by cost tracking
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  groupId?: string;
  workspacePath: string;
  leadAgentModel: string;
  tokenBudget?: TokenBudgetConfig;
  // Sprint 1 additions
  operationMode?: OperationMode;
  autoDelegation?: boolean;
  modelConfig?: ProjectModelConfig;
  heartbeatConfig?: ProjectHeartbeatConfig;
  spawnPermissions?: SpawnPermission[];
  notificationConfig?: ProjectNotificationConfig;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  roster: RosterMember[];
  taskCount: { backlog: number; progress: number; review: number; blocked?: number; done: number };
  memoryDocCount: number;
}

// ─── Roster ─────────────────────────────────────────────────────────────────

export type RosterRole =
  | "lead"
  | "developer"
  | "reviewer"
  | "researcher"
  | "documenter"
  | "custom";

export interface RosterContextFile {
  id: string;
  name: string;
  content: string;
  mimeType?: string;
  addedAt: number;
}

export interface RosterMember {
  agentId: string;
  agentName: string;
  role: RosterRole;
  customRoleLabel?: string;
  permissions: RosterPermissions;
  /** IDs of roster agents this agent can spawn. undefined = all roster agents. */
  spawnTargets?: string[];
  heartbeatConfig?: RosterHeartbeatConfig;
  /** Project-specific context injected into agent's prompt */
  contextOverlay?: string;
  contextFiles?: RosterContextFile[];
  addedAt: number;
}

export type HeartbeatFocus =
  | "board-review"        // Lead: review board, auto-delegate pending tasks
  | "task-progress"       // Dev: check task progress, report blockers
  | "pending-reviews"     // Reviewer: check for pending code reviews
  | "research-update"     // Researcher: update findings, check sources
  | "workspace-sync"      // Any: sync workspace state, git status
  | "agent-health"        // Lead: check health of roster agents
  | "memory-sync"         // Any: update project memory with learnings
  | "custom";             // Custom heartbeat prompt

export interface RosterHeartbeatConfig {
  enabled: boolean;
  intervalSeconds: number;
  focus: HeartbeatFocus[];
  customPrompt?: string;
  activeHours?: { start: number; end: number }; // 0-23, e.g. { start: 9, end: 18 }
}

export const HEARTBEAT_FOCUS_OPTIONS: { value: HeartbeatFocus; label: string; description: string; roles: RosterRole[] }[] = [
  { value: "board-review",    label: "Board Review",     description: "Review board, auto-delegate pending tasks",     roles: ["lead"] },
  { value: "task-progress",   label: "Task Progress",    description: "Check task progress, report blockers",          roles: ["lead", "developer", "researcher", "documenter"] },
  { value: "pending-reviews", label: "Pending Reviews",  description: "Check for pending code reviews",                roles: ["reviewer"] },
  { value: "research-update", label: "Research Update",  description: "Update findings, check new sources",            roles: ["researcher"] },
  { value: "workspace-sync",  label: "Workspace Sync",   description: "Sync workspace state, check for changes",      roles: ["lead", "developer", "reviewer", "researcher", "documenter", "custom"] },
  { value: "agent-health",    label: "Agent Health",      description: "Check health of roster agents",                roles: ["lead"] },
  { value: "memory-sync",     label: "Memory Sync",       description: "Update project memory with learnings",         roles: ["lead", "developer", "researcher", "documenter"] },
  { value: "custom",          label: "Custom",             description: "Custom heartbeat prompt",                      roles: ["lead", "developer", "reviewer", "researcher", "documenter", "custom"] },
];

export const ROLE_DEFAULT_HEARTBEAT: Record<RosterRole, RosterHeartbeatConfig> = {
  lead:       { enabled: true,  intervalSeconds: 60,  focus: ["board-review", "agent-health", "task-progress"] },
  developer:  { enabled: true,  intervalSeconds: 300, focus: ["task-progress", "workspace-sync"] },
  reviewer:   { enabled: true,  intervalSeconds: 300, focus: ["pending-reviews"] },
  researcher: { enabled: true,  intervalSeconds: 300, focus: ["research-update", "memory-sync"] },
  documenter: { enabled: true,  intervalSeconds: 300, focus: ["workspace-sync", "memory-sync"] },
  custom:     { enabled: false, intervalSeconds: 300, focus: [] },
};

export interface RosterPermissions {
  read: boolean;
  write: boolean;
  exec: boolean;
  webSearch: boolean;
  sessionsSend: boolean;
  sessionsSpawn: boolean;
}

export const ROLE_DEFAULT_PERMISSIONS: Record<RosterRole, RosterPermissions> = {
  lead:       { read: true, write: true,  exec: true,  webSearch: true,  sessionsSend: true,  sessionsSpawn: true  },
  developer:  { read: true, write: true,  exec: true,  webSearch: true,  sessionsSend: false, sessionsSpawn: false },
  reviewer:   { read: true, write: false, exec: false, webSearch: true,  sessionsSend: true,  sessionsSpawn: false },
  researcher: { read: true, write: false, exec: false, webSearch: true,  sessionsSend: true,  sessionsSpawn: true  },
  documenter: { read: true, write: true,  exec: false, webSearch: true,  sessionsSend: false, sessionsSpawn: false },
  custom:     { read: true, write: false, exec: false, webSearch: false, sessionsSend: false, sessionsSpawn: false },
};

export const ROLE_ICONS: Record<RosterRole, string> = {
  lead: "crown",
  developer: "code",
  reviewer: "search",
  researcher: "flask-conical",
  documenter: "file-text",
  custom: "zap",
};

// ─── File Attachments ───────────────────────────────────────────────────────

export interface FileAttachment {
  id: string;
  path: string;
  label?: string;
  addedAt: number;
}

// ─── Task Board ─────────────────────────────────────────────────────────────

export type TaskStatus = "backlog" | "progress" | "review" | "blocked" | "done" | "paused";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog",  label: "Backlog" },
  { id: "progress", label: "In Progress" },
  { id: "review",   label: "Review" },
  { id: "blocked",  label: "Blocked" },
  { id: "done",     label: "Done" },
];

export type TaskDelegationStatus = "idle" | "delegating" | "delegated" | "em-unavailable";

export interface ExecutionMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  timestamp: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId: string | null;
  assignedAgentName?: string;
  createdBy: "user" | "lead-agent" | "pipeline";
  parentTaskId?: string;
  subtasks: Task[];
  sessionId?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  attachments: FileAttachment[];
  /** Context injected into the agent prompt alongside the task */
  contextNote?: string;
  contextFiles?: RosterContextFile[];
  // EM delegation
  delegationStatus?: TaskDelegationStatus;
  emDecisionReason?: string;
  emDelegatedAt?: number;
  // Execution
  executionLog?: ExecutionMessage[];
  timeoutMs?: number;
  // Dependencies
  dependsOn?: string[];         // task IDs that must complete before this starts
}

export function getBlockingDeps(task: Task, allTasks: Task[]): Task[] {
  if (!task.dependsOn || task.dependsOn.length === 0) return [];
  return allTasks.filter((t) => task.dependsOn!.includes(t.id) && t.status !== "done");
}

export interface TaskTemplate {
  id: string;
  label: string;
  icon: string;
  title: string;
  description: string;
  priority: TaskPriority;
  suggestedRole: RosterRole;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "code-review",
    label: "Code Review",
    icon: "\uD83D\uDCCB",
    title: "Review: [branch/PR name]",
    description: "Review the code changes for quality, correctness, and adherence to project standards. Check for edge cases, performance issues, and documentation.",
    priority: "medium",
    suggestedRole: "reviewer",
  },
  {
    id: "candidate-eval",
    label: "Candidate Eval",
    icon: "\uD83D\uDC64",
    title: "Evaluate candidate: [name]",
    description: "Review the candidate's resume and portfolio. Assess technical skills, experience alignment, and culture fit for the open position.",
    priority: "high",
    suggestedRole: "researcher",
  },
  {
    id: "deploy-checklist",
    label: "Deploy Checklist",
    icon: "\uD83D\uDE80",
    title: "Deploy: [version/feature]",
    description: "Run pre-deploy checks: tests passing, env vars configured, rollback plan ready. Execute deployment and monitor for 15 minutes post-deploy.",
    priority: "critical",
    suggestedRole: "developer",
  },
  {
    id: "research",
    label: "Research",
    icon: "\uD83D\uDD2C",
    title: "Research: [topic]",
    description: "Investigate and summarize findings on the given topic. Include sources, key insights, and recommendations.",
    priority: "low",
    suggestedRole: "researcher",
  },
];

// ─── Pipeline ───────────────────────────────────────────────────────────────

export type StepStatus = "pending" | "running" | "success" | "failed" | "skipped";
export type StepExecution = "sequential" | "parallel";

export interface PipelineStep {
  id: string;
  label: string;
  agentRole: RosterRole;
  agentId?: string;
  executionType: StepExecution;
  dependsOn: string[];
  inputFrom?: string;
  successCriteria?: string;
  timeoutMs: number;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  output?: string;
  sessionId?: string;
}

export type PipelineTrigger =
  | { type: "manual" }
  | { type: "schedule"; cron: string }
  | { type: "webhook"; secret: string }
  | { type: "github"; event: "push" | "pr_opened" | "pr_merged"; branch?: string };

export type PipelineStatus = "idle" | "running" | "success" | "failed" | "paused";

export interface Pipeline {
  id: string;
  projectId: string;
  name: string;
  trigger: PipelineTrigger;
  steps: PipelineStep[];
  status: PipelineStatus;
  lastRunAt?: number;
  runCount: number;
}

// ─── Memory ─────────────────────────────────────────────────────────────────

export type MemoryDocType = "file" | "decision" | "spec" | "note" | "url";
export type EmbeddingStatus = "pending" | "processing" | "embedded" | "failed";

export interface MemoryDocument {
  id: string;
  projectId: string;
  title: string;
  type: MemoryDocType;
  content?: string;
  filePath?: string;
  url?: string;
  tags: string[];
  attachments: FileAttachment[];
  embeddingStatus: EmbeddingStatus;
  addedAt: number;
  updatedAt: number;
}

// ─── Triggers ───────────────────────────────────────────────────────────────

export type TriggerAction =
  | { type: "run_pipeline"; pipelineId: string }
  | { type: "create_task"; title: string; assignTo: RosterRole }
  | { type: "notify"; message: string };

export interface ProjectTrigger {
  id: string;
  projectId: string;
  name: string;
  event: PipelineTrigger;
  action: TriggerAction;
  enabled: boolean;
  lastFiredAt?: number;
  fireCount: number;
}
