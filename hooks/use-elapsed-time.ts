"use client";

import { useState, useEffect } from "react";

export function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function useElapsedTime(startedAt: number | undefined): {
  elapsed: string;
  elapsedMs: number;
  isOvertime: boolean;
} {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return { elapsed: "—", elapsedMs: 0, isOvertime: false };

  const elapsedMs = Math.max(0, now - startedAt);
  const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 min
  return {
    elapsed: formatElapsed(elapsedMs),
    elapsedMs,
    isOvertime: elapsedMs > DEFAULT_TIMEOUT,
  };
}
