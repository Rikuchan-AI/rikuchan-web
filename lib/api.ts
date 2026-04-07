import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (token) {
      return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    }
  } catch {
    // Client-side or no auth available
  }
  return { "Content-Type": "application/json" };
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
    cache: "no-store",
    signal: options?.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Analytics types (moved from gateway.ts) ---

export type AnalyticsSummary = {
  period: string;
  total_requests: number;
  total_cost_usd: number;
  total_cost_without_gateway_usd: number;
  total_savings_usd: number;
  savings_pct: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  rag_usage_rate: number;
  error_rate: number;
  roi: number | null;
  plan: string;
  plan_price_usd: number;
  data_confidence: "sufficient" | "insufficient" | "collecting";
  request_count_threshold_met: boolean;
};

export type TimelinePoint = {
  date: string;
  requests: number;
  cost_usd: number;
  cost_without_gateway_usd: number;
  savings_usd: number;
  cache_hit_rate: number;
};

export type AnalyticsTimeline = {
  period: string;
  points: TimelinePoint[];
};

export type SavingsVector = {
  vector: "cache" | "routing" | "trimming";
  savings_usd: number;
  pct_of_total: number;
  confidence: "measured" | "calculated" | "estimated";
  request_count: number;
  description_pt: string;
  description_en: string;
};

export type SavingsBreakdown = {
  total_savings_usd: number;
  vectors: SavingsVector[];
};

export type ProviderUsage = {
  provider: string;
  requests: number;
  cost_usd: number;
  avg_latency_ms: number;
  pct_of_total: number;
};

export type ModelUsage = {
  model: string;
  provider: string;
  requests: number;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  pct_of_total: number;
};

export type ProviderBreakdown = {
  providers: ProviderUsage[];
  models: ModelUsage[];
};

export type Insight = {
  type: "cost_trend" | "cache_opportunity" | "model_recommendation" | "savings_milestone";
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  confidence: "measured" | "calculated" | "estimated";
};

// --- Analytics fetch functions ---

export async function getAnalyticsSummary(period = "30d"): Promise<AnalyticsSummary> {
  return apiFetch(`/api/v1/analytics/summary?period=${period}`);
}

export async function getAnalyticsTimeline(period = "30d"): Promise<AnalyticsTimeline> {
  return apiFetch(`/api/v1/analytics/timeline?period=${period}`);
}

export async function getSavingsBreakdown(period = "30d"): Promise<SavingsBreakdown> {
  return apiFetch(`/api/v1/analytics/savings-breakdown?period=${period}`);
}

export async function getProviderBreakdown(period = "30d"): Promise<ProviderBreakdown> {
  return apiFetch(`/api/v1/analytics/providers?period=${period}`);
}

export async function getAnalyticsInsights(period = "30d"): Promise<{ insights: Insight[] }> {
  return apiFetch(`/api/v1/analytics/insights?period=${period}`);
}
