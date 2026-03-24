import { auth } from "@clerk/nextjs/server";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

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

export async function gatewayFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- API Keys ---

export type ApiKey = {
  id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_rpm: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ApiKeyCreated = {
  key: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_rpm: number;
  expires_at: string | null;
};

export async function listApiKeys(): Promise<ApiKey[]> {
  return gatewayFetch("/v1/api-keys");
}

export async function createApiKey(body: {
  name: string;
  scopes?: string[];
  rate_limit_rpm?: number;
  expires_at?: string | null;
}): Promise<ApiKeyCreated> {
  return gatewayFetch("/v1/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function revokeApiKey(keyPrefix: string): Promise<void> {
  return gatewayFetch(`/v1/api-keys/${keyPrefix}`, { method: "DELETE" });
}

export async function rotateApiKey(keyPrefix: string): Promise<ApiKeyCreated> {
  return gatewayFetch(`/v1/api-keys/${keyPrefix}/rotate`, { method: "POST" });
}

// --- Billing ---

export type Plan = {
  plan: string;
  status: string;
  limits: Record<string, unknown>;
};

export type UsageSummary = {
  total_requests_24h: number;
  total_cost_24h: number;
  total_tokens_in_24h: number;
  total_tokens_out_24h: number;
  cost_by_provider: { provider: string; cost_usd: number; requests: number }[];
  cost_by_model: { model: string; cost_usd: number; requests: number; tokens_in: number; tokens_out: number }[];
};

export type UsageHistory = {
  days: { date: string; requests: number; cost_usd: number; tokens_in: number; tokens_out: number }[];
};

export async function getPlan(): Promise<Plan> {
  return gatewayFetch("/v1/billing/plan");
}

export async function getUsage(): Promise<UsageSummary> {
  return gatewayFetch("/v1/billing/usage");
}

export async function getUsageHistory(days = 30): Promise<UsageHistory> {
  return gatewayFetch(`/v1/billing/usage/history?days=${days}`);
}

// --- Settings ---

export type ProviderStatus = {
  provider: string;
  connected: boolean;
  auth_kind: string | null;
  last_validated_at: string | null;
};

export type ProviderConnectResult = {
  status: string;
  provider: string;
  auth_kind: string;
};

export type Workspace = {
  name: string;
  plan: string;
  providers_connected: number;
  knowledge_sources: number;
};

export async function listProviders(): Promise<ProviderStatus[]> {
  return gatewayFetch("/v1/settings/providers");
}

export async function connectProvider(provider: string, apiKey: string): Promise<ProviderConnectResult> {
  return gatewayFetch("/v1/settings/providers", {
    method: "POST",
    body: JSON.stringify({ provider, api_key: apiKey }),
  });
}

export async function disconnectProvider(provider: string): Promise<void> {
  return gatewayFetch(`/v1/settings/providers/${provider}`, { method: "DELETE" });
}

export async function getWorkspace(): Promise<Workspace> {
  return gatewayFetch("/v1/settings/workspace");
}

// --- Dashboard Overview ---

export type DashboardOverview = {
  requests_today: number;
  context_hit_rate_pct: number;
  estimated_spend_usd: number;
  active_providers: string[];
  cache_stats: Record<string, unknown>;
  rag_stats: Record<string, unknown>;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return gatewayFetch("/dashboard/api/overview");
}

// --- Analytics ---

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

export async function getAnalyticsSummary(period = "30d"): Promise<AnalyticsSummary> {
  return gatewayFetch(`/v1/analytics/summary?period=${period}`);
}

export async function getAnalyticsTimeline(period = "30d"): Promise<AnalyticsTimeline> {
  return gatewayFetch(`/v1/analytics/timeline?period=${period}`);
}

export async function getSavingsBreakdown(period = "30d"): Promise<SavingsBreakdown> {
  return gatewayFetch(`/v1/analytics/savings-breakdown?period=${period}`);
}

export async function getProviderBreakdown(period = "30d"): Promise<ProviderBreakdown> {
  return gatewayFetch(`/v1/analytics/providers?period=${period}`);
}

export async function getAnalyticsInsights(period = "30d"): Promise<{ insights: Insight[] }> {
  return gatewayFetch(`/v1/analytics/insights?period=${period}`);
}
