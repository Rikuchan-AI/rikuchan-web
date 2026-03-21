"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Activity } from "lucide-react";
import type { Task } from "@/lib/mc/types-project";

interface ActivityStreamProps {
  projectId: string;
  tasks: Task[];
  isCollapsed: boolean;
  onToggle: () => void;
}

type FilterTab = "all" | "tasks" | "alerts";

interface ActivityEvent {
  id: string;
  text: string;
  dotColor: string;
  timestamp: number;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function deriveEvents(tasks: Task[]): ActivityEvent[] {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const events: ActivityEvent[] = [];

  for (const task of tasks) {
    // Tasks updated in the last hour
    if (task.updatedAt >= oneHourAgo) {
      let dotColor = "bg-foreground-muted";
      if (task.status === "blocked") dotColor = "bg-red-400";
      else if (task.status === "done") dotColor = "bg-emerald-400";
      else if (task.status === "progress") dotColor = "bg-blue-400";
      else if (task.status === "review") dotColor = "bg-amber-400";

      events.push({
        id: `${task.id}-status`,
        text: `Task "${task.title}" moved to ${task.status}`,
        dotColor,
        timestamp: task.updatedAt,
      });
    }
  }

  // Sort newest first
  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}

export function ActivityStream({ tasks, isCollapsed, onToggle }: ActivityStreamProps) {
  const [filter, setFilter] = useState<FilterTab>("all");

  const allEvents = useMemo(() => deriveEvents(tasks), [tasks]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return allEvents;
    if (filter === "alerts") return allEvents.filter((e) => e.dotColor === "bg-red-400");
    // "tasks" — all non-alert events
    return allEvents.filter((e) => e.dotColor !== "bg-red-400");
  }, [allEvents, filter]);

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "tasks", label: "Tasks" },
    { id: "alerts", label: "Alerts" },
  ];

  return (
    <div
      className="mt-3 rounded-lg border border-line bg-surface transition-all"
      style={{ height: isCollapsed ? "40px" : "160px" }}
    >
      {/* Collapsed / header bar */}
      <button
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between px-4"
      >
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-foreground-muted" />
          <span className="mono text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Activity
          </span>
          <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[9px] font-medium text-foreground-muted">
            {allEvents.length}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronUp size={12} className="text-foreground-muted" />
        ) : (
          <ChevronDown size={12} className="text-foreground-muted" />
        )}
      </button>

      {/* Expanded content */}
      {!isCollapsed && (
        <div className="flex flex-col px-4 pb-3 overflow-hidden" style={{ height: "120px" }}>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                  filter === tab.id
                    ? "bg-accent-soft text-accent border border-accent/15"
                    : "text-foreground-muted hover:text-foreground border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Horizontal scrolling event feed */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex items-start gap-3 h-full">
              {filteredEvents.length === 0 ? (
                <div className="flex items-center h-full">
                  <p className="text-[11px] text-foreground-muted">No recent activity</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex shrink-0 items-start gap-2 rounded-md border border-line bg-surface-strong px-3 py-2 max-w-[240px]"
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${event.dotColor}`} />
                    <div className="min-w-0">
                      <p className="text-[11px] text-foreground-soft leading-tight line-clamp-2">
                        {event.text}
                      </p>
                      <p className="mono mt-0.5 text-[9px] text-foreground-muted">
                        {relativeTime(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
