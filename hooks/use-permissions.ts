"use client";

import { useOrganization } from "@clerk/nextjs";
import {
  type TenantRole,
  type Permission,
  can as canCheck,
  normalizeClerkRole,
} from "@/lib/mc/permissions";

export function usePermissions() {
  const { membership, organization } = useOrganization();

  // Personal (no org) = implicit admin — can do everything
  const isPersonal = !organization;
  const role: TenantRole = isPersonal
    ? "admin"
    : normalizeClerkRole(membership?.role);

  function can(permission: Permission): boolean {
    if (isPersonal) return true; // personal = god mode
    return canCheck(role, permission);
  }

  return {
    can,
    role,
    isPersonal,
    isAdmin: role === "admin",
    isOperator: role === "operator",
    // Backward compat (remove after full migration)
    canRead: true,
    canWrite: can("board.create_task"),
    canDelete: can("projects.delete"),
    canManageMembers: can("members.invite"),
    canManageBilling: can("billing.manage"),
    canManageSettings: can("settings.workspace"),
  };
}
