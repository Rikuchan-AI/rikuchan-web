export type TenantRole = "admin" | "operator";

export type Permission = string;

export const ROLE_HIERARCHY: Record<TenantRole, number> = {
  admin: 2,
  operator: 1,
};

// ---------------------------------------------------------------------------
// Granular permission sets per role
// ---------------------------------------------------------------------------

const ADMIN_PERMISSIONS: Permission[] = [
  // Gateway & Infrastructure
  "gateway.connect", "gateway.disconnect", "gateway.configure",
  // Provider Credentials
  "credentials.view", "credentials.create", "credentials.rotate", "credentials.revoke",
  // API Keys
  "api_keys.view", "api_keys.create", "api_keys.rotate", "api_keys.revoke",
  // Agents
  "agents.view", "agents.create", "agents.edit_soul", "agents.delete", "agents.configure_model",
  // Projects & Groups
  "projects.view", "projects.create", "projects.activate", "projects.pause", "projects.delete", "projects.settings",
  "groups.create", "groups.delete",
  // Board Operations
  "board.view", "board.create_task", "board.move_task", "board.assign_task", "board.delete_task", "board.chat_agent", "board.upload_files",
  // Spawn Permissions Config
  "spawn.configure",
  // Members
  "members.view", "members.invite", "members.remove", "members.change_role",
  // Billing & Plans
  "billing.view", "billing.manage",
  // Analytics
  "analytics.view",
  // Settings
  "settings.workspace", "settings.mc",
  // Corpus (Knowledge Base)
  "corpus.view", "corpus.manage",
];

const OPERATOR_PERMISSIONS: Permission[] = [
  // Agents (view only)
  "agents.view",
  // Projects (create, view — no lifecycle management)
  "projects.view", "projects.create",
  // Groups (create only)
  "groups.create",
  // Board (full operational access)
  "board.view", "board.create_task", "board.move_task", "board.assign_task", "board.delete_task", "board.chat_agent", "board.upload_files",
  // Analytics
  "analytics.view",
  // Members (view only)
  "members.view",
  // Billing (view only)
  "billing.view",
  // Corpus (view only)
  "corpus.view",
];

const ROLE_PERMISSIONS: Record<TenantRole, Set<Permission>> = {
  admin: new Set(ADMIN_PERMISSIONS),
  operator: new Set(OPERATOR_PERMISSIONS),
};

// ---------------------------------------------------------------------------
// Permission checks
// ---------------------------------------------------------------------------

/**
 * Check if a role has a specific granular permission.
 * Usage: can("admin", "gateway.configure") → true
 */
export function can(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Check if a role meets or exceeds a minimum role level.
 */
export function meetsMinimumRole(role: TenantRole, minRole: TenantRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

// Backward compat — old broad permission names
export function hasPermission(role: TenantRole, action: string): boolean {
  const broadMap: Record<string, Permission> = {
    read: "board.view",
    write: "board.create_task",
    delete: "projects.delete",
    manage_members: "members.invite",
    manage_billing: "billing.manage",
    manage_settings: "settings.workspace",
  };
  const mapped = broadMap[action];
  if (mapped) return can(role, mapped);
  return can(role, action);
}

/**
 * Normalize Clerk org role to our TenantRole.
 * Clerk uses "org:admin", "org:member" etc.
 */
export function normalizeClerkRole(clerkRole: string | undefined | null): TenantRole {
  if (!clerkRole) return "operator";
  const role = clerkRole.replace("org:", "");
  if (role === "admin") return "admin";
  // "member" and everything else → operator
  return "operator";
}
