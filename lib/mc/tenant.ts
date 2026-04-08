import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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
 * Now delegates to rikuchan-api via GET /tenants/me.
 */
export async function ensureTenant(
  _tenantId: string,
  _userId: string,
  _orgId?: string | null,
): Promise<void> {
  // Tenant auto-provisioning now happens server-side in rikuchan-api
  // when GET /tenants/me or GET /tenants/onboarding is called.
  // This function is kept for backward compat with callers.
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
 * Calls rikuchan-api GET /tenants/onboarding/check.
 */
export async function checkTenantOnboarding(tenantId: string): Promise<boolean> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";
    const res = await fetch(`${API_URL}/api/tenants/onboarding/check`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.completed ?? false;
    }
  } catch {
    // fallback
  }
  return false;
}
