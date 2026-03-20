"use client";

import { Paperclip } from "lucide-react";
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

const statusDotClass: Record<string, string> = {
  backlog:  "bg-[#52525b]",
  progress: "bg-accent",
  review:   "bg-warm",
  blocked:  "bg-danger",
  done:     "bg-[#3f3f46]",
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

  const borderColor = isDelegating
    ? "var(--warm)"
    : isOvertime
      ? "var(--warm)"
      : priorityBorderColor[task.priority] ?? "#52525b";

  const handleClick = () => {
    if (isDragging) return;
    onClick?.();
  };

  return (
    <div
      className={`rounded-lg border p-3.5 transition-all duration-200 cursor-pointer hover:border-line-strong ${
        isBlocked
          ? "bg-danger-soft border-danger/25"
          : "bg-surface border-line"
      } ${isDelegating ? "animate-pulse" : ""}`}
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
      onClick={handleClick}
      title={task.description || task.title}
    >
      {/* Header: title + badges */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-medium text-foreground leading-snug truncate">
            {task.title}
          </h4>
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="rounded bg-surface-strong px-1.5 py-0.5 text-[0.55rem] text-foreground-muted font-semibold flex-shrink-0">
              {task.subtasks.length} sub
            </span>
          )}
        </div>
        <TaskPriorityBadge priority={task.priority} />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-foreground-muted leading-snug line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-strong border border-line-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <Paperclip size={10} className="text-foreground-muted" />
          <span className="mono text-[0.6rem] text-foreground-muted">
            {task.attachments.length} file{task.attachments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Footer: agent */}
      <div className="mt-1">
        {isDelegating ? (
          <span className="text-xs text-warning italic">Lead deciding...</span>
        ) : isLeadUnavailable ? (
          <span className="text-xs text-foreground-muted">Lead unavailable — assign manually</span>
        ) : agentName || task.assignedAgentName ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent text-accent-foreground text-[0.5rem] font-bold">
                {(agentName ?? task.assignedAgentName ?? "")
                  .split(/[\s-]+/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
              <span className="mono text-xs text-foreground-muted">{agentName ?? task.assignedAgentName}</span>
            </div>
            {task.emDecisionReason && (
              <p className="mt-1 text-[11px] text-foreground-muted italic line-clamp-1">
                Lead: &ldquo;{task.emDecisionReason}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-foreground-muted">Unassigned</span>
        )}
      </div>

      {/* Status bar: timer + running */}
      {(isRunning || (task.status === "progress" && task.startedAt)) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line/50">
          {task.status === "progress" && task.startedAt && (
            <span className={`mono text-[11px] ${isOvertime ? "text-warning animate-pulse" : "text-foreground-muted"}`}>
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

      {/* Subtasks */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3 border-t border-line pt-3 space-y-1.5">
          {task.subtasks.slice(0, 4).map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 bg-surface-muted hover:bg-surface-strong transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotClass[sub.status] ?? "bg-foreground-muted"}`} />
              <span className="text-xs text-foreground-soft truncate">{sub.title}</span>
              {sub.assignedAgentName && (
                <span className="ml-auto text-[10px] text-foreground-muted mono flex-shrink-0">
                  {sub.assignedAgentName}
                </span>
              )}
            </div>
          ))}
          {task.subtasks.length > 4 && (
            <p className="text-[10px] text-foreground-muted pl-2">+{task.subtasks.length - 4} more</p>
          )}
        </div>
      )}
    </div>
  );
}
