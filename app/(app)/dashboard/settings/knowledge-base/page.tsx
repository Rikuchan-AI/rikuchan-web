"use client";

import { useCorpusPolling } from "@/hooks/use-corpus-polling";
import { useCorpusStore } from "@/lib/mc/corpus-store";
import { useShallow } from "zustand/react/shallow";
import { usePermissions } from "@/hooks/use-permissions";
import { CorpusOverview } from "./_components/corpus-overview";
import { EmbeddingPipeline } from "./_components/embedding-pipeline";
import { ChunkDistribution } from "./_components/chunk-distribution";
import { SourceBreakdown } from "./_components/source-breakdown";
import { QualityAlerts } from "./_components/quality-alerts";
import { CollectionManager } from "./_components/collection-manager";
import { IngestActivity } from "./_components/ingest-activity";
import { RefreshCw } from "lucide-react";

export default function KnowledgeBasePage() {
  useCorpusPolling();

  const { can } = usePermissions();
  const { loading, error, stats, hydrate } = useCorpusStore(useShallow((s) => ({
    loading: s.loading,
    error: s.error,
    stats: s.stats,
    hydrate: s.hydrate,
  })));

  const canManage = can("corpus.manage");

  // Empty state: no data yet
  if (!loading && !error && stats && stats.total_chunks === 0) {
    return (
      <div className="space-y-6">
        <Header onRefresh={hydrate} loading={loading} />
        <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface p-12 text-center">
          <p className="text-lg font-medium text-foreground">No chunks in your knowledge base</p>
          <p className="mt-2 text-sm text-foreground-soft">
            Start ingesting files through the agent to populate your RAG corpus.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header onRefresh={hydrate} loading={loading} />

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <CorpusOverview />
      <EmbeddingPipeline canManage={canManage} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChunkDistribution />
      </div>

      <SourceBreakdown />
      <QualityAlerts canManage={canManage} />
      <CollectionManager canManage={canManage} />
      <IngestActivity />
    </div>
  );
}

function Header({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Knowledge Base</h1>
        <p className="text-sm text-foreground-soft">
          Corpus health e metricas do RAG
        </p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-line-strong bg-transparent px-4 py-2 text-sm text-foreground-soft hover:bg-surface-strong hover:text-foreground transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
