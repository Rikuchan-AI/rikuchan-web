"use client";

import type { AgentStatus } from "@/lib/mc/types";

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  online:   { label: "Online",    className: "bg-success-soft text-success border border-success/15" },
  idle:     { label: "Idle",      className: "bg-warm-soft text-warm border border-warm/15" },
  thinking: { label: "Thinking",  className: "bg-[rgba(167,139,250,0.10)] text-[#a78bfa] border border-[rgba(167,139,250,0.15)]" },
  degraded: { label: "Degraded",  className: "bg-[rgba(251,146,60,0.10)] text-[#fb923c] border border-[rgba(251,146,60,0.15)]" },
  error:    { label: "Error",     className: "bg-danger-soft text-danger border border-danger/15" },
  offline:  { label: "Offline",   className: "bg-surface-strong text-foreground-muted border border-line-strong" },
};

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const { label, className } = statusConfig[status];
  return (
    <span
      className={`rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] ${className}`}
      aria-label={`Agent status: ${label}`}
    >
      {label}
    </span>
  );
}
