"use client";

import type { AgentStatus } from "@/lib/mc/types";

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  online:   { label: "Online",    className: "bg-emerald-400/10 text-emerald-400 border border-emerald-400/15" },
  idle:     { label: "Idle",      className: "bg-zinc-400/10 text-zinc-400 border border-zinc-400/15" },
  thinking: { label: "Thinking",  className: "bg-[rgba(167,139,250,0.10)] text-[#a78bfa] border border-[rgba(167,139,250,0.15)]" },
  degraded: { label: "Degraded",  className: "bg-amber-400/10 text-amber-400 border border-amber-400/15" },
  error:    { label: "Error",     className: "bg-red-400/10 text-red-400 border border-red-400/15" },
  offline:  { label: "Offline",   className: "bg-red-400/10 text-red-400 border border-red-400/15" },
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
