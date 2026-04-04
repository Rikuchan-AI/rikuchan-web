"use client";

import { useState } from "react";
import { useCorpusCollections, useCorpusActions } from "@/lib/mc/corpus-store";
import { formatNumber, formatBytes, timeAgo } from "@/lib/format";
import { useToast } from "@/components/shared/toast";
import { ConfirmDialog } from "./confirm-dialog";

export function CollectionManager({ canManage }: { canManage: boolean }) {
  const { collections } = useCorpusCollections();
  const { reindex, deleteChunks } = useCorpusActions();
  const toast = useToast();

  const [confirmAction, setConfirmAction] = useState<{
    type: "reindex" | "delete";
    collection: (typeof collections)[number];
  } | null>(null);
  const [acting, setActing] = useState(false);

  if (collections.length === 0) return null;

  async function handleReindex(collectionId: string) {
    setActing(true);
    try {
      const result = await reindex({ scope: "collection", filter: collectionId });
      toast.success(`${result.affected} chunks queued for re-embed`);
    } catch {
      toast.error("Re-index failed");
    } finally {
      setActing(false);
      setConfirmAction(null);
    }
  }

  async function handleDelete(collectionId: string) {
    setActing(true);
    try {
      const result = await deleteChunks({ collection: collectionId });
      toast.success(`${result.affectedCount} chunks archived`);
    } catch {
      toast.error("Delete failed");
    } finally {
      setActing(false);
      setConfirmAction(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
          Collections
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Collection</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Chunks</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Embedded</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Size</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-foreground-muted">Last Chunk</th>
                {canManage && (
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-foreground-muted">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {collections.map((col) => {
                const coverage = col.chunk_count > 0
                  ? ((col.embedded_count / col.chunk_count) * 100).toFixed(0)
                  : "0";

                return (
                  <tr key={col.id} className="border-b border-line/50">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-foreground">{col.slug}</span>
                      {col.name && col.name !== col.slug && (
                        <span className="ml-2 text-foreground-muted text-xs">({col.name})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-foreground-soft">{formatNumber(col.chunk_count)}</td>
                    <td className="px-4 py-2.5 text-foreground-soft">
                      {formatNumber(col.embedded_count)} ({coverage}%)
                    </td>
                    <td className="px-4 py-2.5 text-foreground-soft">{formatBytes(col.total_bytes)}</td>
                    <td className="px-4 py-2.5 text-foreground-muted">{timeAgo(col.newest_chunk)}</td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setConfirmAction({ type: "reindex", collection: col })}
                            disabled={acting}
                            className="rounded px-2 py-1 text-xs text-foreground-soft hover:bg-surface-strong transition-colors disabled:opacity-50"
                          >
                            Re-index
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: "delete", collection: col })}
                            disabled={acting}
                            className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmAction?.type === "reindex" && (
        <ConfirmDialog
          open
          title={`Re-index "${confirmAction.collection.slug}"`}
          description={`This will reset ${formatNumber(confirmAction.collection.chunk_count)} chunks to pending. The embedding worker will re-process them.`}
          confirmLabel="Re-index"
          variant="warning"
          onConfirm={() => handleReindex(confirmAction.collection.id)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction?.type === "delete" && (
        <ConfirmDialog
          open
          title={`Archive "${confirmAction.collection.slug}"`}
          description={`This will archive all ${formatNumber(confirmAction.collection.chunk_count)} chunks in this collection. They will no longer appear in search results.`}
          confirmLabel="Archive Collection"
          variant="danger"
          onConfirm={() => handleDelete(confirmAction.collection.id)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
