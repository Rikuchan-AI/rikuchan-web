"use client";

import { useCorpusActivity } from "@/lib/mc/corpus-store";

const TYPE_COLORS: Record<string, string> = {
  embedded: "bg-emerald-400",
  pending: "bg-zinc-400",
  processing: "bg-blue-400",
  failed: "bg-red-400",
};

const TYPE_LABELS: Record<string, string> = {
  embedded: "embedded",
  pending: "ingested",
  processing: "processing",
  failed: "failed",
};

function formatWindow(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function IngestActivity() {
  const { activity } = useCorpusActivity();

  if (activity.length === 0) return null;

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
        Recent Activity
      </h2>
      <div className="space-y-0">
        {activity.map((item, idx) => {
          const dotColor = TYPE_COLORS[item.type] ?? "bg-zinc-500";
          const label = TYPE_LABELS[item.type] ?? item.type;
          const sources = item.sources?.filter((s) => s !== "unknown") ?? [];

          return (
            <div key={`${item.window}-${item.type}-${idx}`} className="flex items-start gap-3 py-2">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center pt-1">
                <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                {idx < activity.length - 1 && (
                  <span className="w-px flex-1 bg-line mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-foreground-muted font-mono shrink-0">
                    {formatWindow(item.window)}
                  </span>
                  <span className="text-sm text-foreground">
                    {item.count} chunk{item.count !== 1 ? "s" : ""} {label}
                  </span>
                </div>
                {sources.length > 0 && (
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {sources.join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
