"use client";

import { useState } from "react";
import { useCorpusSources } from "@/lib/mc/corpus-store";
import { formatNumber, timeAgo } from "@/lib/format";

type SortKey = "source" | "chunk_count" | "avg_chunk_size" | "embedded_count" | "failed_count" | "last_ingest_at";
type SortDir = "asc" | "desc";

export function SourceBreakdown() {
  const { sources } = useCorpusSources();
  const [sortKey, setSortKey] = useState<SortKey>("chunk_count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (sources.length === 0) return null;

  const sorted = [...sources].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className="cursor-pointer select-none px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted hover:text-foreground transition-colors"
      >
        {label} {active && (sortDir === "asc" ? "↑" : "↓")}
      </th>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
        Sources
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <SortHeader label="Source" field="source" />
              <SortHeader label="Chunks" field="chunk_count" />
              <SortHeader label="Avg Size" field="avg_chunk_size" />
              <SortHeader label="Embedded" field="embedded_count" />
              <SortHeader label="Failed" field="failed_count" />
              <SortHeader label="Last Ingest" field="last_ingest_at" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((src) => (
              <tr
                key={src.source}
                className={`border-b border-line/50 ${src.failed_count > 0 ? "bg-amber-500/5" : ""}`}
              >
                <td className="px-4 py-2.5 font-mono text-foreground">{src.source}</td>
                <td className="px-4 py-2.5 text-foreground-soft">{formatNumber(src.chunk_count)}</td>
                <td className="px-4 py-2.5 text-foreground-soft">{formatNumber(src.avg_chunk_size)} ch</td>
                <td className="px-4 py-2.5 text-foreground-soft">{formatNumber(src.embedded_count)}</td>
                <td className={`px-4 py-2.5 ${src.failed_count > 0 ? "text-red-400" : "text-foreground-soft"}`}>
                  {src.failed_count}
                </td>
                <td className="px-4 py-2.5 text-foreground-muted">{timeAgo(src.last_ingest_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
