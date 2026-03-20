"use client";

import Link from "next/link";
import type { Session } from "@/lib/mc/types";
import { formatRelativeTime, formatDuration } from "@/lib/mc/mc-utils";

const statusBadge: Record<string, string> = {
  active:    "text-accent",
  completed: "text-foreground-muted",
  error:     "text-danger",
  idle:      "text-warm",
};

interface AgentSessionListProps {
  sessions: Session[];
  maxItems?: number;
}

export function AgentSessionList({ sessions, maxItems = 5 }: AgentSessionListProps) {
  const displayed = sessions.slice(0, maxItems);

  if (displayed.length === 0) {
    return <p className="text-sm text-foreground-muted py-4">No sessions found.</p>;
  }

  return (
    <div className="space-y-2">
      {displayed.map((session) => {
        const duration = session.endedAt
          ? formatDuration(session.endedAt - session.startedAt)
          : formatDuration(Date.now() - session.startedAt);

        return (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 hover:bg-surface-strong transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="mono text-xs text-foreground-muted">{session.id}</span>
                <span className={`mono text-xs uppercase font-semibold ${statusBadge[session.status]}`} style={{ letterSpacing: "0.06em" }}>
                  {session.status}
                </span>
              </div>
              <p className="text-sm text-foreground truncate">{session.taskPreview}</p>
            </div>
            <div className="flex flex-col items-end ml-4 flex-shrink-0 text-xs text-foreground-muted">
              <span>{duration}</span>
              <span>{formatRelativeTime(session.startedAt)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
