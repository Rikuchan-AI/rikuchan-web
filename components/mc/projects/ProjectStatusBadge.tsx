"use client";

import type { ProjectStatus } from "@/lib/mc/types-project";

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",     className: "bg-surface-strong text-foreground-muted border border-line" },
  active:    { label: "Active",    className: "bg-accent-soft text-accent border border-accent/15" },
  paused:    { label: "Paused",    className: "bg-warm-soft text-warm border border-warm/15" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" },
  archived:  { label: "Archived",  className: "bg-surface-strong text-foreground-soft border border-line-strong" },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={`rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] ${className}`}
      aria-label={`Project status: ${label}`}
    >
      {label}
    </span>
  );
}
