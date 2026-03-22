import { getSupabaseAdmin } from "./supabase-server";

interface FeatureFlag {
  key: string;
  description: string | null;
  enabled_globally: boolean;
  enabled_plans: string[];
  enabled_tenants: string[];
}

// Cache flags for 30s to avoid DB hits on every check
let flagsCache: { flags: FeatureFlag[]; expiresAt: number } | null = null;
const FLAGS_TTL_MS = 30_000;

async function loadFlags(): Promise<FeatureFlag[]> {
  if (flagsCache && flagsCache.expiresAt > Date.now()) return flagsCache.flags;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("feature_flags").select("*");
  const flags = (data || []) as FeatureFlag[];
  flagsCache = { flags, expiresAt: Date.now() + FLAGS_TTL_MS };
  return flags;
}

export async function isFeatureEnabled(tenantId: string, flagKey: string, tenantPlan?: string): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.find((f) => f.key === flagKey);
  if (!flag) return false;
  if (flag.enabled_globally) return true;
  if (flag.enabled_tenants.includes(tenantId)) return true;
  if (tenantPlan && flag.enabled_plans.includes(tenantPlan)) return true;
  return false;
}

export function invalidateFlagsCache(): void {
  flagsCache = null;
}
