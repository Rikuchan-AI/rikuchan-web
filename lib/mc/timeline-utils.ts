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

  return null;
}
