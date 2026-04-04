"use client";

import { useCorpusDistribution } from "@/lib/mc/corpus-store";
import { formatNumber } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const BUCKET_ORDER = ["micro", "small", "medium", "large", "xlarge", "oversized"] as const;

const BUCKET_LABELS: Record<string, string> = {
  micro: "<50",
  small: "50-200",
  medium: "200-500",
  large: "500-1K",
  xlarge: "1K-2K",
  oversized: "2K+",
};

const BUCKET_COLORS: Record<string, string> = {
  micro: "#ef4444",
  small: "#a3a3a3",
  medium: "#34d399",
  large: "#34d399",
  xlarge: "#a3a3a3",
  oversized: "#f59e0b",
};

const TYPE_COLORS: Record<string, string> = {
  code: "#3b82f6",
  python: "#3b82f6",
  typescript: "#a855f7",
  markdown: "#34d399",
  conversation: "#14b8a6",
  config: "#6b7280",
  json: "#6b7280",
  yaml: "#6b7280",
  html: "#f59e0b",
  pdf: "#ef4444",
  other: "#525252",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
};

export function ChunkDistribution() {
  const { distribution } = useCorpusDistribution();

  if (!distribution) {
    return (
      <>
        <div className="rounded-lg border border-line bg-surface p-6 animate-pulse">
          <div className="h-4 w-40 rounded bg-surface-strong mb-4" />
          <div className="h-[220px] rounded bg-surface-strong" />
        </div>
      </>
    );
  }

  // Sort histogram buckets
  const sortedHistogram = BUCKET_ORDER
    .map((bucket) => {
      const found = distribution.sizeHistogram.find((h) => h.bucket === bucket);
      return {
        bucket,
        label: BUCKET_LABELS[bucket] ?? bucket,
        count: found?.count ?? 0,
        fill: BUCKET_COLORS[bucket] ?? "#34d399",
      };
    })
    .filter((b) => b.count > 0 || ["micro", "oversized"].includes(b.bucket));

  const totalChunks = distribution.byContentType.reduce((acc, t) => acc + t.count, 0);

  return (
    <>
      {/* Size histogram */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
          Chunk Size Distribution
        </h2>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedHistogram} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(value) => [formatNumber(Number(value)), "chunks"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sortedHistogram.map((entry) => (
                  <Cell key={entry.bucket} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Warnings */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground-muted">
          {sortedHistogram.find((b) => b.bucket === "micro" && b.count > 0) && (
            <span className="text-amber-400">
              micro: {formatNumber(sortedHistogram.find((b) => b.bucket === "micro")!.count)}
            </span>
          )}
          {sortedHistogram.find((b) => b.bucket === "oversized" && b.count > 0) && (
            <span className="text-amber-400">
              oversized: {formatNumber(sortedHistogram.find((b) => b.bucket === "oversized")!.count)}
            </span>
          )}
        </div>
      </div>

      {/* Content type donut */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
          By Content Type
        </h2>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution.byContentType}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="count"
                nameKey="content_type"
              >
                {distribution.byContentType.map((entry) => (
                  <Cell
                    key={entry.content_type}
                    fill={TYPE_COLORS[entry.content_type] ?? "#525252"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, name) => [
                  `${formatNumber(Number(value))} (${totalChunks > 0 ? ((Number(value) / totalChunks) * 100).toFixed(1) : 0}%)`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {distribution.byContentType.map((t) => (
            <span key={t.content_type} className="flex items-center gap-1.5 text-foreground-soft">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[t.content_type] ?? "#525252" }}
              />
              {t.content_type} ({formatNumber(t.count)})
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
