import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

interface ExportResult {
  tenant_id: string;
  exported_at: string;
  tables: Record<string, { count: number; data: unknown[] }>;
}

export async function exportTenantData(tenantId: string): Promise<ExportResult> {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/tenants/${tenantId}/export`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Export API error ${res.status}`);
  return res.json();
}

export async function deleteTenantData(
  tenantId: string,
  _staffUserId: string,
): Promise<{ deleted_tables: string[]; anonymized: boolean }> {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/tenants/${tenantId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Delete API error ${res.status}`);
  return res.json();
}
