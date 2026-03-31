import { getSupabaseAdmin } from "./supabase-server";

export class LimitExceededError extends Error {
  resource: string;
  limit: number;
  current: number;

  constructor(resource: string, limit: number, current: number) {
    super(`Plan limit exceeded for ${resource}: ${current}/${limit}`);
    this.name = "LimitExceededError";
    this.resource = resource;
    this.limit = limit;
    this.current = current;
  }
}

// In-memory cache: avoids 2 queries per write request
const planCache = new Map<string, { limits: Record<string, number>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60s

async function getCachedLimits(tenantId: string): Promise<Record<string, number>> {
  const cached = planCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.limits;

  const supabase = getSupabaseAdmin();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .single();

  const { data: planData } = await supabase
    .from("tenant_plans")
    .select("limits")
    .eq("plan", tenant?.plan || "free")
    .single();

  const limits = (planData?.limits as Record<string, number>) || {};
  planCache.set(tenantId, { limits, expiresAt: Date.now() + CACHE_TTL_MS });
  return limits;
}

const RESOURCE_TABLE_MAP: Record<string, { table: string; countBy: string }> = {
  max_projects: { table: "mc_projects", countBy: "tenant_id" },
  max_api_keys: { table: "api_keys", countBy: "tenant_id" },
};

async function countResource(tenantId: string, resource: string, projectId?: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  if (resource === "max_tasks_per_project" && projectId) {
    const { count } = await supabase
      .from("mc_tasks")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("project_id", projectId);
    return count || 0;
  }

  const mapping = RESOURCE_TABLE_MAP[resource];
  if (!mapping) return 0;

  const { count } = await supabase
    .from(mapping.table)
    .select("id", { count: "exact", head: true })
    .eq(mapping.countBy, tenantId);
  return count || 0;
}

/**
 * Check if a tenant has reached a plan limit for a given resource.
 * Throws LimitExceededError if the limit is exceeded.
 * A limit of 0 means unlimited.
 */
export async function checkLimit(
  tenantId: string,
  resource: string,
  projectId?: string,
): Promise<void> {
  const limits = await getCachedLimits(tenantId);
  const limit = limits[resource];

  // 0 or undefined = unlimited
  if (!limit || limit === 0) return;

  const current = await countResource(tenantId, resource, projectId);
  if (current >= limit) {
    throw new LimitExceededError(resource, limit, current);
  }
}

/** Invalidate cached limits for a tenant (e.g., after plan change) */
export function invalidatePlanCache(tenantId: string): void {
  planCache.delete(tenantId);
}
