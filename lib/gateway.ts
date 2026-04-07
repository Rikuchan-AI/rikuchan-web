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
    signal: options?.signal ?? AbortSignal.timeout(15_000),
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
  family: string;
  display_name: string;
  credential_mode: "api_key" | "oauth";
  connected: boolean;
  status: "ready" | "oauth_required" | "oauth_supported" | "api_key_required";
  auth_kind: string | null;
  last_validated_at: string | null;
  manage_scope: "tenant";
  can_manage: boolean;
};

export type ProviderConnectResult = {
  status: string;
  provider: string;
  auth_kind: string;
};

export type ProviderOAuthSession = {
  session_id: string;
  provider: string;
  account_label: string;
  status: string;
  authorize_url: string | null;
  error_message: string | null;
  completed_at: string | null;
  expires_at: string | null;
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

export async function startProviderOAuth(
  provider: string,
  accountLabel = "default",
): Promise<ProviderOAuthSession> {
  return gatewayFetch("/v1/settings/providers/oauth/start", {
    method: "POST",
    body: JSON.stringify({ provider, account_label: accountLabel }),
  });
}

export async function getProviderOAuthStatus(sessionId: string): Promise<ProviderOAuthSession> {
  return gatewayFetch(`/v1/settings/providers/oauth/${sessionId}`);
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

// Analytics types and functions moved to @/lib/api
