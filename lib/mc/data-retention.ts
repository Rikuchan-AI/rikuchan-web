import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

interface RetentionResult {
  tenant_id: string;
  plan: string;
  retention_days: number;
  purged: Record<string, number>;
}

export async function enforceRetentionForTenant(tenantId: string): Promise<RetentionResult> {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/retention/${tenantId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Retention API error ${res.status}`);
  return res.json();
}

export async function enforceRetentionAll(): Promise<RetentionResult[]> {
  // This should be called from a cron job hitting the API directly.
  // Kept for backward compat; individual tenants are handled via admin endpoint.
  return [];
}

export async function hardPurgeSoftDeletedTenants(): Promise<string[]> {
  // Handled by cron/admin endpoints in rikuchan-api
  return [];
}
