"use client";

import { Paperclip, GitBranch, RefreshCw, AlertTriangle } from "lucide-react";
import type { Task } from "@/lib/mc/types-project";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { LivePulse } from "@/components/mc/ui/LivePulse";
import { useElapsedTime } from "@/hooks/use-elapsed-time";

const priorityBorderColor: Record<string, string> = {
  critical: "var(--danger)",
  high:     "var(--warm)",
  medium:   "var(--accent)",
  low:      "#52525b",
};

interface TaskCardProps {
  task: Task;
  agentName?: string;
  onClick?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, agentName, onClick, isDragging }: TaskCardProps) {
  const isBlocked = task.status === "blocked";
  const isRunning = !!task.sessionId && task.status === "progress";
  const isDelegating = task.delegationStatus === "delegating";
  const isLeadUnavailable = task.delegationStatus === "em-unavailable";
  const { elapsed, isOvertime } = useElapsedTime(task.status === "progress" ? task.startedAt : undefined);
  const displayName = agentName ?? task.assignedAgentName;

  const borderColor = isDelegating
    ? "var(--warm)"
    : isOvertime
      ? "var(--warm)"
      : priorityBorderColor[task.priority] ?? "#52525b";

  const handleClick = () => {
    if (isDragging) return;
    onClick?.();
  };

  // Subtask progress
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.status === "done").length ?? 0;
  const subtaskProgress = subtaskCount > 0 ? (subtaskDone / subtaskCount) * 100 : 0;

  return (
    <div
      className={`group rounded-lg border transition-all duration-150 cursor-pointer ${
        isBlocked
          ? "bg-danger-soft/40 border-danger/20 hover:border-danger/40"
          : isDragging
            ? "bg-surface-strong border-accent/30 shadow-lg shadow-accent/5"
            : "bg-surface-strong/80 border-line/60 hover:border-line-strong hover:bg-surface-strong"
      } ${isDelegating ? "animate-pulse" : ""}`}
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
      onClick={handleClick}
      title={task.description || task.title}
    >
      {/* Main content area */}
      <div className="px-3 pt-3 pb-2.5">
        {/* Header: title + priority */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
            {task.title}
          </h4>
          <TaskPriorityBadge priority={task.priority} />
        </div>

        {/* Description — compact */}
        {task.description && (
          <p className="text-[11px] text-foreground-muted leading-snug line-clamp-1 mb-2">
            {task.description}
          </p>
        )}

        {/* Tags — inline */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.55rem] text-foreground-muted font-medium"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[0.55rem] text-foreground-muted/60">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Metadata row: agent + attachments + deps */}
        <div className="flex items-center gap-2 mt-1">
          {isDelegating ? (
            <span className="text-[11px] text-warning italic">Lead deciding...</span>
          ) : isLeadUnavailable ? (
            <span className="text-[11px] text-foreground-muted">Lead unavailable</span>
          ) : displayName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/15 text-accent text-[0.5rem] font-bold flex-shrink-0">
                {displayName
                  .split(/[\s-]+/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
              <span className="mono text-[11px] text-foreground-muted truncate">{displayName}</span>
            </div>
          ) : (
            <span className="text-[11px] text-foreground-muted/50">Unassigned</span>
          )}

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* Retry count */}
            {(task.retryCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400" title={`Retry ${task.retryCount}/3`}>
                <RefreshCw size={9} />
                <span className="mono text-[9px]">{task.retryCount}</span>
              </span>
            )}
            {/* Escalated */}
            {task.escalatedAt && (
              <span className="text-red-400" title="Escalated">
                <AlertTriangle size={9} />
              </span>
            )}
            {/* Attachment count */}
            {task.attachments && task.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-foreground-muted/60">
                <Paperclip size={9} />
                <span className="mono text-[9px]">{task.attachments.length}</span>
              </span>
            )}
            {/* Dependencies */}
            {task.dependsOn && task.dependsOn.length > 0 && (
              <span className="flex items-center gap-0.5 text-foreground-muted/60" title={`Depends on ${task.dependsOn.length} task(s)`}>
                <GitBranch size={9} />
                <span className="mono text-[9px]">{task.dependsOn.length}</span>
              </span>
            )}
          </div>
        </div>

        {/* EM Rationale — compact */}
        {task.emDecisionReason && !isDelegating && (
          <p className="mt-1.5 text-[10px] text-foreground-muted/70 italic line-clamp-1">
            &ldquo;{task.emDecisionReason}&rdquo;
          </p>
        )}
      </div>

      {/* Subtask progress bar */}
      {subtaskCount > 0 && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/60 transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="mono text-[9px] text-foreground-muted tabular-nums">
              {subtaskDone}/{subtaskCount}
            </span>
          </div>
        </div>
      )}

      {/* Running status bar */}
      {(isRunning || (task.status === "progress" && task.startedAt)) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-line/30 bg-surface-muted/30 rounded-b-lg">
          {task.status === "progress" && task.startedAt && (
            <span className={`mono text-[10px] tabular-nums ${isOvertime ? "text-warning animate-pulse" : "text-foreground-muted"}`}>
              {elapsed}
            </span>
          )}
          {isRunning && (
            <div className="flex items-center gap-1 ml-auto">
              <LivePulse color="var(--status-online)" size={5} />
              <span className="mono text-[0.55rem] uppercase font-semibold text-accent" style={{ letterSpacing: "0.06em" }}>
                Running
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
