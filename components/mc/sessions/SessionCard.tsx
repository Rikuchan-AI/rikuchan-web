"use client";

import Link from "next/link";
import type { Session } from "@/lib/mc/types";
import { formatRelativeTime, formatDuration } from "@/lib/mc/mc-utils";
import { LivePulse } from "@/components/mc/ui/LivePulse";

const statusConfig: Record<string, { label: string; color: string }> = {
  active:    { label: "Active",     color: "#34d399" },
  completed: { label: "Completed",  color: "#71717a" },
  error:     { label: "Error",      color: "#f87171" },
  idle:      { label: "Idle",       color: "#fbbf24" },
};

interface SessionCardProps {
  session: Session;
  isSelected?: boolean;
}

export function SessionCard({ session, isSelected = false }: SessionCardProps) {
  const { label, color } = statusConfig[session.status] ?? { label: session.status, color: "#71717a" };
  const duration = session.endedAt
    ? formatDuration(session.endedAt - session.startedAt)
    : formatDuration(Date.now() - session.startedAt);

  return (
    <Link
      href={`/agents/sessions/${session.id}`}
      className={`block rounded-lg border p-4 transition-all duration-200 ${
        isSelected
          ? "border-accent/40 bg-accent-soft"
          : "border-line bg-surface hover:bg-surface-strong"
      }`}
    >
      {/* Status + ID */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {session.status === "active" ? (
            <LivePulse color={color} size={7} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          )}
          <span
            className="mono text-[0.65rem] uppercase font-semibold"
            style={{ color, letterSpacing: "0.08em" }}
          >
            {label}
          </span>
        </div>
        <span className="mono text-xs text-foreground-muted">{session.id}</span>
      </div>

      {/* Task preview */}
      <p className="text-sm text-foreground leading-snug line-clamp-2 mb-3">
        {session.taskPreview}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span className="font-medium text-foreground-soft">{session.agentName}</span>
        <div className="flex items-center gap-2">
          <span>{duration}</span>
          <span>·</span>
          <span>{formatRelativeTime(session.startedAt)}</span>
        </div>
      </div>

      {/* Error cause */}
      {session.errorCause && (
        <p className="mt-2 text-xs text-danger line-clamp-1">{session.errorCause}</p>
      )}
    </Link>
  );
}
