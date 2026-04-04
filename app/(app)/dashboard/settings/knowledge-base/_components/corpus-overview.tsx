"use client";

import { useCorpusStats } from "@/lib/mc/corpus-store";
import { formatNumber, formatBytes, formatDuration, timeAgo } from "@/lib/format";

function StatusDot({ status }: { status: "good" | "warn" | "bad" }) {
  const colors = {
    good: "bg-emerald-400",
    warn: "bg-amber-400",
    bad: "bg-red-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
}

export function CorpusOverview() {
  const { stats, loading } = useCorpusStats();

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface p-5 animate-pulse">
            <div className="h-3 w-20 rounded bg-surface-strong" />
            <div className="mt-4 h-8 w-16 rounded bg-surface-strong" />
            <div className="mt-2 h-3 w-24 rounded bg-surface-strong" />
          </div>
        ))}
      </div>
    );
  }

  const coveragePct = stats.total_chunks > 0
    ? ((stats.embedded / stats.total_chunks) * 100).toFixed(1)
    : "0";

  const coverageStatus: "good" | "warn" | "bad" =
    Number(coveragePct) >= 98 ? "good" : Number(coveragePct) >= 90 ? "warn" : "bad";

  const alertStatus: "good" | "warn" | "bad" =
    stats.alert_count === 0 ? "good" : stats.alert_count <= 3 ? "warn" : "bad";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <MetricCard
        label="Chunks"
        value={formatNumber(stats.total_chunks)}
        helper="total active"
      />
      <MetricCard
        label="Embedded"
        value={`${coveragePct}%`}
        helper={`${formatNumber(stats.embedded)} of ${formatNumber(stats.total_chunks)}`}
        indicator={<StatusDot status={coverageStatus} />}
      />
      <MetricCard
        label="Storage"
        value={formatBytes(stats.total_content_bytes)}
        helper={`avg ${formatNumber(stats.avg_chunk_size)} chars/chunk`}
      />
      <MetricCard
        label="Last embed"
        value={timeAgo(stats.last_embedded_at)}
        helper={stats.last_embedded_at
          ? new Date(stats.last_embedded_at).toLocaleTimeString()
          : "no embeddings yet"}
      />
      <MetricCard
        label="Alerts"
        value={String(stats.alert_count)}
        helper={stats.alert_count === 0 ? "all clear" : "issues found"}
        indicator={<StatusDot status={alertStatus} />}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  indicator,
}: {
  label: string;
  value: string;
  helper: string;
  indicator?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">{label}</p>
      <div className="mt-4 flex items-center gap-2">
        <p className="text-[2rem] font-semibold text-accent leading-none">{value}</p>
        {indicator}
      </div>
      <p className="mt-2 text-sm text-foreground-soft">{helper}</p>
    </div>
  );
}
