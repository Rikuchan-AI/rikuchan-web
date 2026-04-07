"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  CorpusStats,
  CorpusSource,
  ChunkDistribution,
  CorpusCollection,
  IngestActivity,
  QualityAlert,
  ReindexRequest,
  CleanupRequest,
} from "./types-corpus";

// ---------------------------------------------------------------------------
// Direct fetch helper (bypasses McApiClient — works outside GatewayProvider)
// ---------------------------------------------------------------------------

const MC_PROXY_URL = "/api/mc/proxy";

let _tokenGetter: (() => Promise<string | null>) | null = null;

/** Must be called once with Clerk's getToken before hydrate() */
export function setCorpusTokenGetter(fn: () => Promise<string | null>) {
  _tokenGetter = fn;
}

async function corpusFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = _tokenGetter ? await _tokenGetter() : null;
  const res = await fetch(`${MC_PROXY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Corpus API error ${res.status}`);
  }

  const body = await res.json();
  return body.data ?? body;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface CorpusStore {
  stats: CorpusStats | null;
  sources: CorpusSource[];
  distribution: ChunkDistribution | null;
  collections: CorpusCollection[];
  activity: IngestActivity[];
  quality: QualityAlert[];

  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  // Actions
  hydrate: () => Promise<void>;
  reindex: (req: ReindexRequest) => Promise<{ affected: number }>;
  cleanup: (req: CleanupRequest) => Promise<{ affectedCount: number; dryRun: boolean }>;
  deleteChunks: (filter: { ids?: string[]; collection?: string; source?: string }) => Promise<{ affectedCount: number }>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCorpusStore = create<CorpusStore>((set, get) => ({
  stats: null,
  sources: [],
  distribution: null,
  collections: [],
  activity: [],
  quality: [],

  loading: false,
  error: null,
  lastFetchedAt: null,

  hydrate: async () => {
    if (get().loading) return;
    if (!_tokenGetter) return; // Not ready yet
    set({ loading: true, error: null });

    try {
      // Use Promise.allSettled so individual failures don't block everything
      const [statsR, sourcesR, distributionR, collectionsR, activityR, qualityR] =
        await Promise.allSettled([
          corpusFetch<CorpusStats>("/api/corpus/stats"),
          corpusFetch<CorpusSource[]>("/api/corpus/sources"),
          corpusFetch<ChunkDistribution>("/api/corpus/distribution"),
          corpusFetch<CorpusCollection[]>("/api/corpus/collections"),
          corpusFetch<IngestActivity[]>("/api/corpus/activity"),
          corpusFetch<QualityAlert[]>("/api/corpus/quality"),
        ]);

      const prev = get();
      set({
        stats: statsR.status === "fulfilled" ? statsR.value : prev.stats,
        sources: sourcesR.status === "fulfilled" ? sourcesR.value : prev.sources,
        distribution: distributionR.status === "fulfilled" ? distributionR.value : prev.distribution,
        collections: collectionsR.status === "fulfilled" ? collectionsR.value : prev.collections,
        activity: activityR.status === "fulfilled" ? activityR.value : prev.activity,
        quality: qualityR.status === "fulfilled" ? qualityR.value : prev.quality,
        loading: false,
        lastFetchedAt: statsR.status === "fulfilled" ? Date.now() : prev.lastFetchedAt,
        error: statsR.status === "rejected" ? String(statsR.reason) : null,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch corpus data",
      });
    }
  },

  reindex: async (req) => {
    const result = await corpusFetch<{ affected: number }>("/api/corpus/reindex", {
      method: "POST",
      body: JSON.stringify(req),
    });
    get().hydrate();
    return result;
  },

  cleanup: async (req) => {
    const result = await corpusFetch<{ affectedCount: number; dryRun: boolean }>("/api/corpus/cleanup", {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (!req.dryRun) get().hydrate();
    return result;
  },

  deleteChunks: async (filter) => {
    const result = await corpusFetch<{ affectedCount: number }>("/api/corpus/chunks", {
      method: "DELETE",
      body: JSON.stringify({ filter, confirm: true }),
    });
    get().hydrate();
    return result;
  },
}));

// ---------------------------------------------------------------------------
// Selectors (for shallow comparison in components)
// ---------------------------------------------------------------------------

export function useCorpusStats() {
  return useCorpusStore(useShallow((s) => ({
    stats: s.stats,
    loading: s.loading,
    error: s.error,
  })));
}

export function useCorpusSources() {
  return useCorpusStore(useShallow((s) => ({
    sources: s.sources,
  })));
}

export function useCorpusDistribution() {
  return useCorpusStore(useShallow((s) => ({
    distribution: s.distribution,
  })));
}

export function useCorpusCollections() {
  return useCorpusStore(useShallow((s) => ({
    collections: s.collections,
  })));
}

export function useCorpusActivity() {
  return useCorpusStore(useShallow((s) => ({
    activity: s.activity,
  })));
}

export function useCorpusQuality() {
  return useCorpusStore(useShallow((s) => ({
    quality: s.quality,
  })));
}

export function useCorpusActions() {
  return useCorpusStore(useShallow((s) => ({
    reindex: s.reindex,
    cleanup: s.cleanup,
    deleteChunks: s.deleteChunks,
    hydrate: s.hydrate,
  })));
}
