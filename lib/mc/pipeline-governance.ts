/**
 * Pipeline governance rules for Mission Control board.
 *
 * Defines allowed transitions between task statuses, required roles,
 * and validations. The board enforces these before allowing drag-and-drop moves.
 */

import type { Task, TaskStatus, WorkType } from "./types-project";

export type OperationMode = "manual" | "supervised" | "autonomous";
export type ActorRole = "human" | "lead" | "agent";

interface StageTransition {
  from: TaskStatus | "*";
  to: TaskStatus;
  requiredRole: "any" | "lead" | "human";
  autoTransition: boolean;
  requiresApproval: boolean;
  validations: string[];
}

interface TransitionResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

const TRANSITIONS: StageTransition[] = [
  {
    from: "backlog",
    to: "progress",
    requiredRole: "any",
    autoTransition: true,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "progress",
    to: "review",
    requiredRole: "any",
    autoTransition: true,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "review",
    to: "done",
    requiredRole: "lead",
    autoTransition: false,
    requiresApproval: true,
    validations: [],
  },
  {
    from: "review",
    to: "progress",
    requiredRole: "any",
    autoTransition: true,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "*",
    to: "blocked",
    requiredRole: "any",
    autoTransition: true,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "blocked",
    to: "progress",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "blocked",
    to: "backlog",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "done",
    to: "progress",
    requiredRole: "human",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "backlog",
    to: "done",
    requiredRole: "human",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "progress",
    to: "backlog",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "progress",
    to: "done",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "*",
    to: "paused",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "paused",
    to: "progress",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
  {
    from: "paused",
    to: "backlog",
    requiredRole: "any",
    autoTransition: false,
    requiresApproval: false,
    validations: [],
  },
];

function findTransition(
  from: TaskStatus,
  to: TaskStatus,
): StageTransition | undefined {
  return (
    TRANSITIONS.find((t) => t.from === from && t.to === to) ??
    TRANSITIONS.find((t) => t.from === "*" && t.to === to)
  );
}

export function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  mode: OperationMode,
  actor: ActorRole,
  _task?: Task,
): TransitionResult {
  if (from === to) return { allowed: false, reason: "Same status" };

  const transition = findTransition(from, to);
  if (!transition) {
    return { allowed: false, reason: `Cannot move from ${from} to ${to}` };
  }

  // Check role requirements
  if (transition.requiredRole === "human" && actor !== "human") {
    return { allowed: false, reason: "Only humans can make this transition" };
  }
  if (transition.requiredRole === "lead" && actor === "agent") {
    return { allowed: false, reason: "Requires lead agent or human" };
  }

  // Check approval requirements based on operation mode
  if (transition.requiresApproval) {
    if (mode === "manual") {
      // In manual mode, approval is implicit (human clicking = approval)
      return { allowed: true };
    }
    if (mode === "supervised" && actor !== "human") {
      return { allowed: false, reason: "Requires human approval in supervised mode", requiresApproval: true };
    }
  }

  return { allowed: true };
}

export function getValidTransitions(
  from: TaskStatus,
  mode: OperationMode,
): TaskStatus[] {
  const valid: TaskStatus[] = [];
  const allStatuses: TaskStatus[] = ["backlog", "progress", "review", "blocked", "done", "paused"];

  for (const to of allStatuses) {
    const result = canTransition(from, to, mode, "human");
    if (result.allowed) valid.push(to);
  }

  return valid;
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "text-foreground-muted",
  progress: "text-amber-400",
  review: "text-blue-400",
  blocked: "text-red-400",
  done: "text-emerald-400",
  paused: "text-foreground-muted",
};

// ─── Phase 1: Stuck thresholds + auto-approve ──────────────────────────────

/** Default stale thresholds in minutes, per work type. */
export const DEFAULT_STALE_THRESHOLDS: Record<string, number> = {
  task: 15,
  bug: 10,
  spike: 30,
  story: 20,
  tech_debt: 20,
  review: 20,
  organization: 20,
  default: 15,
};

/**
 * Resolve the stale threshold for a task based on its workType and tags.
 * Tags take priority (most specific), then workType, then default.
 */
export function resolveStaleThreshold(
  workType: WorkType | string = "task",
  tags: string[] = [],
  overrides: Record<string, number> = {},
): number {
  const thresholds = { ...DEFAULT_STALE_THRESHOLDS, ...overrides };
  // Tags first (most specific)
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (thresholds[lower] !== undefined) return thresholds[lower];
  }
  // Work type
  if (thresholds[workType] !== undefined) return thresholds[workType];
  // Default
  return thresholds.default ?? 15;
}

/**
 * Determine if a task in review should be auto-approved (skip human review).
 * Autonomous mode + medium/low priority = auto-approve.
 */
export function shouldAutoApproveReview(
  mode: OperationMode,
  priority: string,
): boolean {
  return mode === "autonomous" && (priority === "medium" || priority === "low");
}

export const STATUS_BG: Record<TaskStatus, string> = {
  backlog: "bg-foreground-muted/10",
  progress: "bg-amber-400/10",
  review: "bg-blue-400/10",
  blocked: "bg-red-400/10",
  done: "bg-emerald-400/10",
  paused: "bg-foreground-muted/10",
};
