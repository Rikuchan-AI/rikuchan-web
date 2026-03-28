export interface TimelineEvent {
  label: string;
  time: number;
  detail?: string;
  color?: string;
}

export interface CollapsedEvent {
  label: string;
  detail?: string;
  color?: string;
  count: number;
  firstTimestamp: number;
  lastTimestamp: number;
  individualTimestamps: number[];
}

export function collapseTimelineEvents(events: TimelineEvent[]): CollapsedEvent[] {
  const collapsed: CollapsedEvent[] = [];

  for (const event of events) {
    const last = collapsed[collapsed.length - 1];

    if (last && last.label === event.label && last.detail === event.detail) {
      last.count += 1;
      last.lastTimestamp = event.time;
      last.individualTimestamps.push(event.time);
    } else {
      collapsed.push({
        label: event.label,
        detail: event.detail,
        color: event.color,
        count: 1,
        firstTimestamp: event.time,
        lastTimestamp: event.time,
        individualTimestamps: [event.time],
      });
    }
  }

  return collapsed;
}

export function detectTimelineInsight(events: CollapsedEvent[]): string | null {
  const blockedEvent = events.find(
    (e) => e.label.toLowerCase().includes("blocked") && e.count >= 3
  );

  if (blockedEvent) {
    const durationMin = Math.max(1, Math.floor((blockedEvent.lastTimestamp - blockedEvent.firstTimestamp) / 60000));
    return `Agent stuck on the same issue \u00d7${blockedEvent.count} in ${durationMin} min. Consider reassigning or adding context.`;
  }

  // Detect nudge escalation pattern
  const nudgeEvents = events.filter((e) => e.label.toLowerCase().includes("nudge"));
  if (nudgeEvents.length >= 2) {
    return "Multiple nudges sent without response. Agent may be unresponsive.";
  }

  // Detect retry loop
  const retryEvents = events.filter((e) => e.label.toLowerCase().includes("retry"));
  if (retryEvents.length >= 2) {
    return "Task has been retried multiple times. Consider changing approach or providing more context.";
  }

  return null;
}

// ─── Phase 2: Build timeline events from task state ──────────────────────────

/** Color map for timeline event types */
export const TIMELINE_COLORS: Record<string, string> = {
  created: "#71717a",     // zinc
  assigned: "#60a5fa",    // blue
  started: "#f59e0b",     // amber
  blocked: "#ef4444",     // red
  review: "#3b82f6",      // blue
  done: "#10b981",        // emerald
  nudge: "#818cf8",       // indigo
  retry: "#f59e0b",       // amber
  escalation: "#ef4444",  // red
  unblocked: "#10b981",   // emerald
};

/**
 * Build timeline events from a task's execution log, enriched with
 * nudge/retry/escalation markers from system messages.
 */
export function classifyLogEvent(content: string): { label: string; color: string } | null {
  const lower = content.toLowerCase();
  if (lower.includes("nudge")) return { label: "Nudge sent", color: TIMELINE_COLORS.nudge };
  if (lower.includes("retry") || lower.includes("changes requested")) return { label: "Retry requested", color: TIMELINE_COLORS.retry };
  if (lower.includes("escalat")) return { label: "Escalated", color: TIMELINE_COLORS.escalation };
  if (lower.includes("unblock")) return { label: "Unblocked", color: TIMELINE_COLORS.unblocked };
  if (lower.includes("auto-approved")) return { label: "Auto-approved", color: TIMELINE_COLORS.done };
  if (lower.includes("cancelled")) return { label: "Cancelled", color: TIMELINE_COLORS.blocked };
  return null;
}
