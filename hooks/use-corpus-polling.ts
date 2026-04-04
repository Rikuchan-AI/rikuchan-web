"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useCorpusStore, setCorpusTokenGetter } from "@/lib/mc/corpus-store";

const NORMAL_INTERVAL_MS = 30_000;
const FAST_INTERVAL_MS = 5_000;

/**
 * Auto-polls corpus stats. Polls faster when there are pending/processing chunks.
 * Injects the Clerk auth token into the corpus store on mount.
 * Call once at the page level.
 */
export function useCorpusPolling() {
  const { getToken } = useAuth();
  const pending = useCorpusStore((s) => s.stats?.pending ?? 0);
  const processing = useCorpusStore((s) => s.stats?.processing ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasPending = pending > 0 || processing > 0;

  const poll = useCallback(() => {
    useCorpusStore.getState().hydrate();
  }, []);

  // Inject token getter + initial fetch
  useEffect(() => {
    setCorpusTokenGetter(() => getToken());
    poll();
  }, [getToken, poll]);

  // Polling interval — adapts speed based on pending state
  useEffect(() => {
    const ms = hasPending ? FAST_INTERVAL_MS : NORMAL_INTERVAL_MS;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(poll, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll, hasPending]);
}
