import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

export interface TenantGateway {
  id: string;
  tenant_id: string;
  gateway_url: string;
  gateway_slug: string;
  railway_service_id: string | null;
  status: "provisioning" | "active" | "suspended" | "decommissioning";
  created_at: string;
  updated_at: string;
}

async function apiFetchInternal<T>(path: string, options?: RequestInit): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    signal: options?.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function getGatewayForTenant(_tenantId: string): Promise<string> {
  const data = await apiFetchInternal<{ gateway_url: string }>("/api/gateway/url");
  return data.gateway_url;
}

export async function provisionTenantGateway(
  _tenantId: string,
  tenantSlug: string,
): Promise<TenantGateway> {
  const { data } = await apiFetchInternal<{ data: TenantGateway }>("/api/gateway/provision", {
    method: "POST",
    body: JSON.stringify({ tenant_slug: tenantSlug }),
  });
  return data;
}

export async function activateTenantGateway(
  _tenantId: string,
  railwayServiceId: string,
): Promise<void> {
  await apiFetchInternal("/api/gateway/activate", {
    method: "POST",
    body: JSON.stringify({ railway_service_id: railwayServiceId }),
  });
}

export async function suspendTenantGateway(_tenantId: string): Promise<void> {
  await apiFetchInternal("/api/gateway/suspend", { method: "POST" });
}

export async function decommissionTenantGateway(_tenantId: string): Promise<void> {
  await apiFetchInternal("/api/gateway/decommission", { method: "POST" });
}
