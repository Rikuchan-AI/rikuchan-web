"use client";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

async function getClerkToken(): Promise<string | null> {
  // Dynamic import to avoid SSR issues
  try {
    const clerk = (window as any).Clerk;
    if (clerk?.session) {
      return await clerk.session.getToken();
    }
  } catch { /* no clerk available */ }
  return null;
}

export async function gatewayFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getClerkToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...opts,
    headers: { ...headers, ...opts?.headers },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Types
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

export type UsageSummary = {
  total_requests_24h: number;
  total_cost_24h: number;
  total_tokens_in_24h: number;
  total_tokens_out_24h: number;
  cost_by_provider: { provider: string; cost_usd: number; requests: number }[];
  cost_by_model: { model: string; cost_usd: number; requests: number; tokens_in: number; tokens_out: number }[];
};

export type DashboardOverview = {
  requests_today: number;
  context_hit_rate_pct: number;
  estimated_spend_usd: number;
  active_providers: string[];
};
