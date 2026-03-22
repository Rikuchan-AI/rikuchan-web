import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase-server";
import { type TenantRole, type Permission, can, meetsMinimumRole, normalizeClerkRole } from "./permissions";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: TenantRole;
}

/**
 * Resolve the current tenant from Clerk auth.
 * - If the user has an active org: tenantId = orgId
 * - If personal account: tenantId = userId (implicit admin)
 */
export async function resolveTenantId(): Promise<TenantContext> {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return {
    tenantId: orgId || userId,
    userId,
    role: orgId ? normalizeClerkRole(orgRole) : "admin",
  };
}

/**
 * Auto-provision a tenant record on first access.
 * Uses upsert to avoid race conditions.
 */
export async function ensureTenant(
  tenantId: string,
  userId: string,
  orgId?: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .single();

  if (!data) {
    await supabase.from("tenants").upsert(
      {
        id: tenantId,
        type: orgId ? "org" : "personal",
        owner_user_id: userId,
        clerk_org_id: orgId || null,
        plan: "free",
      },
      { onConflict: "id" },
    );
  }
}

/**
 * Server-side role check (hierarchy-based).
 * Throws a 403 NextResponse if the user's role is below the minimum.
 */
export async function requireRole(ctx: TenantContext, minRole: TenantRole): Promise<void> {
  if (!meetsMinimumRole(ctx.role, minRole)) {
    throw NextResponse.json(
      { error: `Requires ${minRole} role or higher` },
      { status: 403 },
    );
  }
}

/**
 * Server-side granular permission check.
 * Throws a 403 NextResponse if the user lacks the permission.
 * Personal accounts (no org) always pass.
 */
export async function requirePermission(ctx: TenantContext, permission: Permission): Promise<void> {
  if (!can(ctx.role, permission)) {
    throw NextResponse.json(
      { error: `Missing permission: ${permission}` },
      { status: 403 },
    );
  }
}

/**
 * Check if the tenant has completed onboarding.
 * Returns true for tenants created before onboarding feature was deployed.
 */
export async function checkTenantOnboarding(tenantId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenants")
    .select("onboarding_completed, created_at")
    .eq("id", tenantId)
    .single();

  if (!data) return false;
  if (data.onboarding_completed) return true;

  // Auto-complete for tenants created before onboarding feature
  const ONBOARDING_LAUNCH = "2026-03-23T00:00:00Z";
  if (new Date(data.created_at) < new Date(ONBOARDING_LAUNCH)) {
    await supabase.from("tenants").update({ onboarding_completed: true }).eq("id", tenantId);
    return true;
  }

  return false;
}
