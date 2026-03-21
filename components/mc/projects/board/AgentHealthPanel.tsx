"use client";

import { useEffect, useMemo } from "react";
import { X, Heart, Clock } from "lucide-react";
import type { RosterMember, Task } from "@/lib/mc/types-project";

interface AgentHealthPanelProps {
  roster: RosterMember[];
  tasks: Task[];
  onClose: () => void;
}

function getStartOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export function AgentHealthPanel({ roster, tasks, onClose }: AgentHealthPanelProps) {
  const startOfDay = useMemo(() => getStartOfDay(), []);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Per-agent metrics
  const agentMetrics = useMemo(() => {
    return roster.map((member) => {
      const agentTasks = tasks.filter((t) => t.assignedAgentId === member.agentId);
      const completedToday = agentTasks.filter(
        (t) => t.completedAt && t.completedAt >= startOfDay,
      );
      const active = agentTasks.filter(
        (t) => t.status === "progress" || t.status === "review",
      );
      return { member, completedToday: completedToday.length, active: active.length };
    });
  }, [roster, tasks, startOfDay]);

  // Summary
  const summary = useMemo(() => {
    const totalDone = tasks.filter(
      (t) => t.completedAt && t.completedAt >= startOfDay,
    ).length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;

    // Average task duration
    const durations: number[] = [];
    for (const t of tasks) {
      if (t.completedAt && t.startedAt) {
        durations.push(t.completedAt - t.startedAt);
      }
    }
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : null;

    return { totalDone, blocked, avgDuration };
  }, [tasks, startOfDay]);

  const maxBar = Math.max(
    ...agentMetrics.map((m) => m.completedToday + m.active),
    1,
  );

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Agent Health"
        className="fixed right-0 top-0 bottom-0 z-50 w-[380px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
              <Heart size={14} className="text-accent" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Agent Health</p>
              <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                Last 24h
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Agent rows */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {agentMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Heart size={20} className="text-foreground-muted mb-2" />
              <p className="text-sm text-foreground-muted">No agents in roster</p>
            </div>
          ) : (
            agentMetrics.map(({ member, completedToday, active }) => {
              const total = completedToday + active;
              const completedWidth = total > 0 ? (completedToday / maxBar) * 100 : 0;
              const activeWidth = total > 0 ? (active / maxBar) * 100 : 0;

              return (
                <div
                  key={member.agentId}
                  className="rounded-lg border border-line bg-surface-muted p-3 space-y-2"
                >
                  {/* Agent name + role */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {member.agentName}
                      </p>
                      <span className="mono rounded bg-surface-strong px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-foreground-muted">
                        {member.customRoleLabel ?? member.role}
                      </span>
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="text-foreground-muted">
                      Done today:{" "}
                      <span className="font-semibold text-emerald-400">{completedToday}</span>
                    </span>
                    <span className="text-foreground-muted">
                      Active:{" "}
                      <span className="font-semibold text-accent">{active}</span>
                    </span>
                  </div>

                  {/* Bar chart */}
                  <div className="flex items-center gap-1 h-2">
                    {completedWidth > 0 && (
                      <div
                        className="h-full rounded-full bg-emerald-400/70 transition-all"
                        style={{ width: `${completedWidth}%` }}
                      />
                    )}
                    {activeWidth > 0 && (
                      <div
                        className="h-full rounded-full bg-accent/50 transition-all"
                        style={{ width: `${activeWidth}%` }}
                      />
                    )}
                    {total === 0 && (
                      <div className="h-full w-full rounded-full bg-surface-strong" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary metrics */}
        <div className="border-t border-line px-5 py-4">
          <p className="mono text-[9px] uppercase tracking-wider text-foreground-muted mb-3">
            Summary
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface-muted p-2.5 text-center">
              <p className="text-lg font-semibold text-emerald-400">{summary.totalDone}</p>
              <p className="text-[10px] text-foreground-muted">Done today</p>
            </div>
            <div className="rounded-lg bg-surface-muted p-2.5 text-center">
              <p className="text-lg font-semibold text-red-400">{summary.blocked}</p>
              <p className="text-[10px] text-foreground-muted">Blocked</p>
            </div>
            <div className="rounded-lg bg-surface-muted p-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <Clock size={12} className="text-foreground-muted" />
                <p className="text-lg font-semibold text-foreground">
                  {summary.avgDuration !== null ? formatDuration(summary.avgDuration) : "—"}
                </p>
              </div>
              <p className="text-[10px] text-foreground-muted">Avg duration</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
