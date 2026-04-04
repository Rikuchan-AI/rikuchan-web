// ---------------------------------------------------------------------------
// Corpus Health Dashboard — API response types
// ---------------------------------------------------------------------------

export interface CorpusStats {
  total_chunks: number;
  embedded: number;
  pending: number;
  processing: number;
  failed: number;
  stuck: number;
  total_content_bytes: number;
  avg_chunk_size: number;
  micro_chunks: number;
  oversized_chunks: number;
  alert_count: number;
  total_collections: number;
  last_embedded_at: string | null;
}

export interface CorpusSource {
  source: string;
  chunk_count: number;
  avg_chunk_size: number;
  last_ingest_at: string;
  embedded_count: number;
  failed_count: number;
}

export interface SizeHistogramBucket {
  bucket: "micro" | "small" | "medium" | "large" | "xlarge" | "oversized";
  count: number;
}

export interface ContentTypeBreakdown {
  content_type: string;
  count: number;
}

export interface ChunkDistribution {
  sizeHistogram: SizeHistogramBucket[];
  byContentType: ContentTypeBreakdown[];
}

export interface CorpusCollection {
  id: string;
  slug: string;
  name: string | null;
  chunk_count: number;
  embedded_count: number;
  total_bytes: number;
  oldest_chunk: string | null;
  newest_chunk: string | null;
}

export interface IngestActivity {
  window: string;
  type: string;
  count: number;
  sources?: string[];
}

export interface QualityAlert {
  type: string;
  severity: "warning" | "info" | "success";
  count: number;
  message: string;
  actionLabel: string | null;
  actionEndpoint: string | null;
}

export interface ReindexRequest {
  scope: "all" | "failed" | "collection";
  filter?: string;
}

export interface CleanupRequest {
  type: "micro_chunks";
  dryRun?: boolean;
}

export interface CleanupResponse {
  dryRun: boolean;
  affectedCount: number;
}

export interface ReindexResponse {
  scope: string;
  affected: number;
}

export interface BulkDeleteRequest {
  filter: {
    ids?: string[];
    collection?: string;
    source?: string;
  };
  confirm: boolean;
}
