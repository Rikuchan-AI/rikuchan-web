"use client";

import type { TaskPriority } from "@/lib/mc/types-project";

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-danger-soft text-danger" },
  high:     { label: "High",     className: "bg-warm-soft text-warm" },
  medium:   { label: "Medium",   className: "bg-accent-soft text-accent" },
  low:      { label: "Low",      className: "bg-surface-strong text-foreground-muted" },
};

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const { label, className } = priorityConfig[priority];
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.06em] ${className}`}
      aria-label={`Priority: ${label}`}
    >
      {label}
    </span>
  );
}
