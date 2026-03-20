"use client";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

async function clientFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type ApiKeyCreated = {
  key: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_rpm: number;
  expires_at: string | null;
};

export async function clientCreateApiKey(
  token: string,
  body: { name: string; scopes?: string[]; rate_limit_rpm?: number; expires_at?: string | null },
): Promise<ApiKeyCreated> {
  return clientFetch("/v1/api-keys", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function clientRevokeApiKey(token: string, keyPrefix: string): Promise<void> {
  return clientFetch(`/v1/api-keys/${keyPrefix}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function clientRotateApiKey(token: string, keyPrefix: string): Promise<ApiKeyCreated> {
  return clientFetch(`/v1/api-keys/${keyPrefix}/rotate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function clientConnectProvider(
  token: string,
  provider: string,
  apiKey: string,
): Promise<void> {
  return clientFetch("/v1/settings/providers", {
    method: "POST",
    body: JSON.stringify({ provider, api_key: apiKey }),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function clientDisconnectProvider(token: string, provider: string): Promise<void> {
  return clientFetch(`/v1/settings/providers/${provider}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
