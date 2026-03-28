import { getSupabaseAdmin } from "./supabase-server";

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

/**
 * Get the gateway URL for a tenant.
 * Team/Enterprise tenants may have a dedicated gateway.
 * Falls back to the shared gateway.
 */
export async function getGatewayForTenant(tenantId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("tenant_gateways")
    .select("gateway_url, status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (data?.gateway_url) return data.gateway_url;

  // Fallback to shared gateway
  return process.env.OPENCLAW_GATEWAY_URL || "wss://openclaw-production-8882.up.railway.app";
}

/**
 * Provision a dedicated gateway for a tenant (Team/Enterprise plans).
 * Creates a record in tenant_gateways with status=provisioning.
 * Actual Railway service creation is handled by the infra pipeline.
 */
export async function provisionTenantGateway(
  tenantId: string,
  tenantSlug: string,
): Promise<TenantGateway> {
  const supabase = getSupabaseAdmin();

  const gatewaySlug = `openclaw-${tenantSlug}`;
  const gatewayUrl = `wss://${gatewaySlug}.up.railway.app`;

  const { data, error } = await supabase
    .from("tenant_gateways")
    .upsert(
      {
        tenant_id: tenantId,
        gateway_slug: gatewaySlug,
        gateway_url: gatewayUrl,
        status: "provisioning",
      },
      { onConflict: "tenant_id" },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to provision gateway: ${error.message}`);
  return data as TenantGateway;
}

/**
 * Mark a tenant gateway as active (called after Railway service is ready).
 */
export async function activateTenantGateway(
  tenantId: string,
  railwayServiceId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("tenant_gateways")
    .update({
      status: "active",
      railway_service_id: railwayServiceId,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);
}

/**
 * Suspend a tenant gateway (e.g., when tenant is suspended or decommissioned).
 */
export async function suspendTenantGateway(tenantId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("tenant_gateways")
    .update({
      status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);
}

/**
 * Begin decommissioning a tenant gateway.
 * Flow: suspend → 30d grace → GDPR export → soft-delete → 90d hard purge.
 */
export async function decommissionTenantGateway(tenantId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from("tenant_gateways")
    .update({
      status: "decommissioning",
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);
}
