import { getSupabaseAdmin } from "./supabase-server";

/**
 * Plan-based analytics retention periods.
 * Data older than the retention window is purged.
 */
const PLAN_RETENTION_DAYS: Record<string, number> = {
  free: 7,
  starter: 30,
  team: 90,
  enterprise: 365,
};

/**
 * Tables with time-series data subject to retention policies.
 * Each entry specifies the table name and the timestamp column to filter on.
 */
const RETENTION_TARGETS = [
  { table: "tenant_usage", dateColumn: "date" },
  { table: "gateway_requests", dateColumn: "created_at" },
  { table: "agent_heartbeats", dateColumn: "created_at" },
  { table: "daily_metrics", dateColumn: "date" },
  { table: "embedding_metrics", dateColumn: "created_at" },
  { table: "rag_requests", dateColumn: "created_at" },
] as const;

interface RetentionResult {
  tenant_id: string;
  plan: string;
  retention_days: number;
  purged: Record<string, number>;
}

/**
 * Enforce data retention for a single tenant based on their plan.
 * Deletes time-series data older than the plan's retention window.
 */
export async function enforceRetentionForTenant(tenantId: string): Promise<RetentionResult> {
  const supabase = getSupabaseAdmin();

  // Get tenant plan
  const { data: tenant } = await supabase
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .single();

  const plan = tenant?.plan || "free";
  const retentionDays = PLAN_RETENTION_DAYS[plan] ?? 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoff = cutoffDate.toISOString();

  const purged: Record<string, number> = {};

  for (const target of RETENTION_TARGETS) {
    try {
      // Count first (Supabase delete doesn't return count reliably)
      const { count } = await supabase
        .from(target.table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .lt(target.dateColumn, cutoff);

      if (count && count > 0) {
        await supabase
          .from(target.table)
          .delete()
          .eq("tenant_id", tenantId)
          .lt(target.dateColumn, cutoff);

        purged[target.table] = count;
      }
    } catch {
      // Table might not exist — skip
    }
  }

  return { tenant_id: tenantId, plan, retention_days: retentionDays, purged };
}

/**
 * Enforce data retention for ALL tenants.
 * Designed to be called from a cron job (daily).
 */
export async function enforceRetentionAll(): Promise<RetentionResult[]> {
  const supabase = getSupabaseAdmin();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id")
    .eq("suspended", false);

  if (!tenants?.length) return [];

  const results: RetentionResult[] = [];
  for (const tenant of tenants) {
    const result = await enforceRetentionForTenant(tenant.id);
    // Only include tenants where data was actually purged
    if (Object.keys(result.purged).length > 0) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Hard-purge soft-deleted tenants after 90-day grace period.
 * Called from cron — removes the tenant record entirely.
 */
export async function hardPurgeSoftDeletedTenants(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const purgeThreshold = new Date();
  purgeThreshold.setDate(purgeThreshold.getDate() - 90);

  const { data: toDelete } = await supabase
    .from("tenants")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", purgeThreshold.toISOString());

  if (!toDelete?.length) return [];

  const purgedIds: string[] = [];
  for (const tenant of toDelete) {
    await supabase.from("tenants").delete().eq("id", tenant.id);
    purgedIds.push(tenant.id);
  }

  return purgedIds;
}
