"use client";

import { useState } from "react";
import { useCorpusStats, useCorpusActions } from "@/lib/mc/corpus-store";
import { formatNumber, timeAgo } from "@/lib/format";
import { useToast } from "@/components/shared/toast";
import { ConfirmDialog } from "./confirm-dialog";

function StatusDot({ status }: { status: "online" | "degraded" | "offline" }) {
  const colors = {
    online: "bg-emerald-400",
    degraded: "bg-amber-400",
    offline: "bg-red-400",
  };
  const labels = {
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {labels[status]}
    </span>
  );
}

export function EmbeddingPipeline({ canManage }: { canManage: boolean }) {
  const { stats } = useCorpusStats();
  const { reindex } = useCorpusActions();
  const toast = useToast();

  const [confirmType, setConfirmType] = useState<"failed" | "all" | null>(null);
  const [acting, setActing] = useState(false);

  if (!stats) return null;

  const total = stats.total_chunks;
  const embeddedPct = total > 0 ? (stats.embedded / total) * 100 : 0;
  const pendingPct = total > 0 ? (stats.pending / total) * 100 : 0;
  const processingPct = total > 0 ? (stats.processing / total) * 100 : 0;
  const failedPct = total > 0 ? (stats.failed / total) * 100 : 0;

  // Worker status heuristic
  const workerStatus: "online" | "degraded" | "offline" =
    stats.last_embedded_at && Date.now() - new Date(stats.last_embedded_at).getTime() < 300_000
      ? "online"
      : stats.last_embedded_at && Date.now() - new Date(stats.last_embedded_at).getTime() < 3_600_000
        ? "degraded"
        : "offline";

  async function handleReindex(scope: "failed" | "all") {
    setActing(true);
    try {
      const result = await reindex({ scope });
      toast.success(`Re-embed queued: ${result.affected} chunks reset to pending`);
    } catch {
      toast.error("Failed to trigger re-embed");
    } finally {
      setActing(false);
      setConfirmType(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
          Embedding Pipeline
        </h2>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground-soft mb-4">
          <span className="flex items-center gap-2">
            Worker: <StatusDot status={workerStatus} />
          </span>
          <span>Last embed: {timeAgo(stats.last_embedded_at)}</span>
        </div>

        {/* Queue flow */}
        <div className="flex flex-wrap items-center gap-2 text-sm mb-4">
          <span className="text-foreground-muted">{formatNumber(stats.pending)} pending</span>
          <span className="text-foreground-muted">→</span>
          <span className="text-foreground-muted">{formatNumber(stats.processing)} processing</span>
          <span className="text-foreground-muted">→</span>
          <span className="text-accent">{formatNumber(stats.embedded)} embedded</span>
          {stats.failed > 0 && (
            <>
              <span className="text-foreground-muted ml-4">|</span>
              <span className="text-red-400">{formatNumber(stats.failed)} failed</span>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full rounded-full bg-surface-strong overflow-hidden flex">
          {embeddedPct > 0 && (
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${embeddedPct}%` }}
            />
          )}
          {processingPct > 0 && (
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${processingPct}%` }}
            />
          )}
          {pendingPct > 0 && (
            <div
              className="bg-zinc-500 transition-all duration-500"
              style={{ width: `${pendingPct}%` }}
            />
          )}
          {failedPct > 0 && (
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${Math.max(failedPct, 0.5)}%` }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-foreground-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> embedded
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> processing
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-zinc-500" /> pending
          </span>
          {stats.failed > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> failed
            </span>
          )}
          <span className="ml-auto text-foreground-soft">{embeddedPct.toFixed(1)}%</span>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.failed > 0 && (
              <button
                onClick={() => setConfirmType("failed")}
                disabled={acting}
                className="rounded-lg border border-line-strong bg-transparent px-3 py-1.5 text-xs text-foreground-soft hover:bg-surface-strong transition-colors disabled:opacity-50"
              >
                Re-embed Failed ({stats.failed})
              </button>
            )}
            <button
              onClick={() => setConfirmType("all")}
              disabled={acting}
              className="rounded-lg border border-line-strong bg-transparent px-3 py-1.5 text-xs text-foreground-soft hover:bg-surface-strong transition-colors disabled:opacity-50"
            >
              Re-embed All
            </button>
          </div>
        )}
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmType === "failed"}
        title="Re-embed failed chunks"
        description={`This will reset ${stats.failed} failed chunks to pending. The embedding worker will re-process them.`}
        confirmLabel="Re-embed Failed"
        variant="warning"
        onConfirm={() => handleReindex("failed")}
        onCancel={() => setConfirmType(null)}
      />
      <ConfirmDialog
        open={confirmType === "all"}
        title="Re-embed all chunks"
        description={`This will reset ALL ${formatNumber(stats.total_chunks)} embeddings. The RAG may have reduced quality during re-processing.`}
        confirmLabel="Re-embed All"
        confirmText="REINDEX"
        variant="danger"
        onConfirm={() => handleReindex("all")}
        onCancel={() => setConfirmType(null)}
      />
    </>
  );
}
