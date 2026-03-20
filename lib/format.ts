/**
 * Formatting utilities for the analytics dashboard.
 * Ported from rikuchan-monitor-dashboard/lib/utils.ts.
 */

export function formatUSD(value: number, decimals = 2): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(decimals)}`;
}

export function formatUSDFull(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function periodLabel(period: string): string {
  const days = parseInt(period);
  if (days === 7) return "7 days";
  if (days === 30) return "30 days";
  if (days === 90) return "90 days";
  if (days === 365) return "365 days";
  return `${days} days`;
}
