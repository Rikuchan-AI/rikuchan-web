"use client";

const LOCAL_AGENT_URL = process.env.NEXT_PUBLIC_RIKUCHAN_AGENT_URL || "http://127.0.0.1:3020";

export type LocalProviderOAuthSession = {
  session_id: string;
  provider: string;
  account_label: string;
  status: string;
  authorize_url: string | null;
  error_message?: string | null;
  completed_at?: string | null;
  expires_at?: string | null;
};

async function agentFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${LOCAL_AGENT_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    signal: options?.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Local agent error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function clientStartLocalProviderOAuth(
  provider: string,
  accountLabel = "default",
): Promise<LocalProviderOAuthSession> {
  return agentFetch("/oauth/providers/start", {
    method: "POST",
    body: JSON.stringify({ provider, account_label: accountLabel }),
  });
}

export async function clientGetLocalProviderOAuthStatus(
  sessionId: string,
): Promise<LocalProviderOAuthSession> {
  return agentFetch(`/oauth/providers/${sessionId}`);
}
