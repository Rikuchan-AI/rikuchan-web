import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { resolveTenantId, requirePermission } from "@/lib/mc/tenant";
import { checkLimit, LimitExceededError } from "@/lib/mc/plan-limits";

type Params = { params: Promise<{ path: string[] }> };

async function requireTenant() {
  try {
    const ctx = await resolveTenantId();
    return ctx;
  } catch (err) {
    console.error("[MC API] Auth failed:", err instanceof Error ? err.message : err);
    throw NextResponse.json({ error: "Unauthorized — auth failed" }, { status: 401 });
  }
}

// Table name mapping from path segments
const TABLE_MAP: Record<string, string> = {
  settings: "mc_user_settings",
  groups: "mc_board_groups",
  projects: "mc_projects",
  tasks: "mc_tasks",
  pipelines: "mc_pipelines",
  "memory-docs": "mc_memory_docs",
  triggers: "mc_triggers",
  "chat-sessions": "mc_chat_sessions",
  notifications: "mc_notifications",
};

// Permission required per resource for POST
const POST_PERMISSIONS: Record<string, string> = {
  projects: "projects.create",
  groups: "groups.create",
  tasks: "board.create_task",
  pipelines: "board.create_task",
  "memory-docs": "board.create_task",
  triggers: "board.create_task",
  settings: "board.view", // user settings — any authenticated user
  "chat-sessions": "board.chat_agent",
  notifications: "board.view",
};

// Permission required per resource for PATCH
const PATCH_PERMISSIONS: Record<string, string> = {
  projects: "projects.settings",
  tasks: "board.move_task",
  pipelines: "board.move_task",
  "memory-docs": "board.move_task",
  triggers: "board.move_task",
  groups: "groups.create",
  settings: "board.view",
};

// Permission required per resource for DELETE
const DELETE_PERMISSIONS: Record<string, string> = {
  projects: "projects.delete",
  groups: "groups.delete",
  tasks: "board.delete_task",
  pipelines: "board.delete_task",
  "memory-docs": "board.delete_task",
  triggers: "board.delete_task",
  notifications: "board.view",
  "chat-sessions": "board.view",
};

// GET /api/mc/{resource} — list items
// GET /api/mc/{resource}/{id} — get single item
// GET /api/mc/tasks/{projectId} — list tasks for project
export async function GET(req: NextRequest, { params }: Params) {
  let ctx;
  try { ctx = await requireTenant(); } catch (res) { return res as NextResponse; }
  const { tenantId, userId } = ctx;
  const segments = (await params).path;
  const resource = segments[0];
  const table = TABLE_MAP[resource];
  if (!table) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const supabase = getSupabaseAdmin();

  // Special case: settings (key-value, per-user within tenant)
  if (resource === "settings") {
    const settingKey = segments[1];
    if (settingKey) {
      const { data } = await supabase
        .from(table)
        .select("setting_value")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)  // settings are per-user within tenant
        .eq("setting_key", settingKey)
        .single();
      return NextResponse.json(data?.setting_value ?? null);
    }
    const { data } = await supabase.from(table).select("setting_key,setting_value").eq("tenant_id", tenantId).eq("user_id", userId);
    return NextResponse.json(data ?? []);
  }

  // Resources with project_id scope (tasks, pipelines, memory-docs, triggers)
  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource) && segments[1]) {
    const projectId = segments[1];
    const { data } = await supabase
      .from(table)
      .select("data")
      .eq("tenant_id", tenantId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    return NextResponse.json((data ?? []).map((r: { data: unknown }) => r.data));
  }

  // Chat sessions (per-user within tenant)
  if (resource === "chat-sessions") {
    const { data } = await supabase.from(table).select("session_key,data").eq("tenant_id", tenantId).eq("user_id", userId);
    const sessions: Record<string, unknown> = {};
    for (const row of data ?? []) {
      sessions[row.session_key] = row.data;
    }
    return NextResponse.json(sessions);
  }

  // Notifications
  if (resource === "notifications") {
    const { data } = await supabase
      .from(table)
      .select("data")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    return NextResponse.json((data ?? []).map((r: { data: unknown }) => r.data));
  }

  // Generic: groups, projects
  const { data } = await supabase
    .from(table)
    .select("data")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return NextResponse.json((data ?? []).map((r: { data: unknown }) => r.data));
}

// POST /api/mc/{resource} — create item
export async function POST(req: NextRequest, { params }: Params) {
  let ctx;
  try { ctx = await requireTenant(); } catch (res) { return res as NextResponse; }
  const { tenantId, userId } = ctx;
  const segments = (await params).path;
  const resource = segments[0];
  const table = TABLE_MAP[resource];
  if (!table) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  // Granular permission check per resource
  const permission = POST_PERMISSIONS[resource] || "board.create_task";
  try { await requirePermission(ctx, permission); } catch (res) { return res as NextResponse; }

  const body = await req.json();
  const supabase = getSupabaseAdmin();

  // Plan limit enforcement
  try {
    if (resource === "projects") await checkLimit(tenantId, "max_projects");
    if (resource === "tasks") await checkLimit(tenantId, "max_tasks_per_project", segments[1] || body.projectId);
  } catch (e) {
    if (e instanceof LimitExceededError) {
      return NextResponse.json(
        { error: "Plan limit exceeded", resource: e.resource, limit: e.limit, current: e.current },
        { status: 403 },
      );
    }
    throw e;
  }

  if (resource === "settings") {
    const { key, value } = body;
    const { error } = await supabase.from(table).upsert(
      { user_id: userId, tenant_id: tenantId, setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,setting_key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "chat-sessions") {
    const { sessionKey, data } = body;
    const { error } = await supabase.from(table).upsert(
      { session_key: sessionKey, user_id: userId, tenant_id: tenantId, data, updated_at: Date.now() },
      { onConflict: "user_id,session_key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "notifications") {
    const { error } = await supabase.from(table).upsert(
      { id: body.id, user_id: userId, tenant_id: tenantId, data: body, created_at: body.timestamp ?? Date.now() },
      { onConflict: "user_id,id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Project-scoped resources
  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource)) {
    const projectId = segments[1] || body.projectId;
    const now = Date.now();
    const { error } = await supabase.from(table).upsert(
      { id: body.id, project_id: projectId, user_id: userId, tenant_id: tenantId, data: body, created_at: body.createdAt ?? now, updated_at: body.updatedAt ?? now },
      { onConflict: "project_id,id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(body);
  }

  // Groups, projects
  const now = Date.now();
  const { error } = await supabase.from(table).upsert(
    { id: body.id, user_id: userId, tenant_id: tenantId, data: body, created_at: body.createdAt ?? now, updated_at: body.updatedAt ?? now },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(body);
}

// PATCH /api/mc/{resource}/{id} — update item
export async function PATCH(req: NextRequest, { params }: Params) {
  let ctx;
  try { ctx = await requireTenant(); } catch (res) { return res as NextResponse; }
  const { tenantId } = ctx;
  const segments = (await params).path;
  const resource = segments[0];
  const itemId = segments[1];
  const table = TABLE_MAP[resource];
  if (!table || !itemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Granular permission check per resource
  const permission = PATCH_PERMISSIONS[resource] || "board.move_task";
  try { await requirePermission(ctx, permission); } catch (res) { return res as NextResponse; }

  const body = await req.json();
  const supabase = getSupabaseAdmin();

  // For project-scoped resources, itemId is projectId, segments[2] is the item id
  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource) && segments[2]) {
    const projectId = itemId;
    const actualId = segments[2];
    const { data: existing } = await supabase
      .from(table)
      .select("data")
      .eq("project_id", projectId)
      .eq("id", actualId)
      .eq("tenant_id", tenantId)
      .single();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const merged = { ...existing.data, ...body, updatedAt: Date.now() };
    const { error } = await supabase
      .from(table)
      .update({ data: merged, updated_at: Date.now() })
      .eq("project_id", projectId)
      .eq("id", actualId)
      .eq("tenant_id", tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(merged);
  }

  // Groups, projects
  const { data: existing } = await supabase
    .from(table)
    .select("data")
    .eq("id", itemId)
    .eq("tenant_id", tenantId)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const merged = { ...existing.data, ...body, updatedAt: Date.now() };
  const { error } = await supabase
    .from(table)
    .update({ data: merged, updated_at: Date.now() })
    .eq("id", itemId)
    .eq("tenant_id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(merged);
}

// DELETE /api/mc/{resource}/{id}
export async function DELETE(req: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await requireTenant();
  } catch (res) {
    console.error("[MC API DELETE] Auth failed");
    return res as NextResponse;
  }
  const { tenantId } = ctx;
  const segments = (await params).path;
  const resource = segments[0];
  const itemId = segments[1];
  const table = TABLE_MAP[resource];
  console.log(`[MC API DELETE] resource=${resource} id=${itemId} tenant=${tenantId} role=${ctx.role}`);
  if (!table || !itemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Granular permission check per resource
  const permission = DELETE_PERMISSIONS[resource] || "projects.delete";
  try {
    await requirePermission(ctx, permission);
  } catch (res) {
    console.error(`[MC API DELETE] Permission denied: ${permission} for role=${ctx.role}`);
    return res as NextResponse;
  }

  const supabase = getSupabaseAdmin();

  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource) && segments[2]) {
    const projectId = itemId;
    const actualId = segments[2];
    await supabase.from(table).delete().eq("project_id", projectId).eq("id", actualId).eq("tenant_id", tenantId);
    return new NextResponse(null, { status: 204 });
  }

  // Delete project and cascade to related data
  if (resource === "projects") {
    await supabase.from("mc_tasks").delete().eq("project_id", itemId).eq("tenant_id", tenantId);
    await supabase.from("mc_pipelines").delete().eq("project_id", itemId).eq("tenant_id", tenantId);
    await supabase.from("mc_memory_docs").delete().eq("project_id", itemId).eq("tenant_id", tenantId);
    await supabase.from("mc_triggers").delete().eq("project_id", itemId).eq("tenant_id", tenantId);
  }

  if (resource === "notifications") {
    await supabase.from(table).delete().eq("id", itemId).eq("tenant_id", tenantId);
    return new NextResponse(null, { status: 204 });
  }

  if (resource === "chat-sessions") {
    await supabase.from(table).delete().eq("session_key", itemId).eq("tenant_id", tenantId);
    return new NextResponse(null, { status: 204 });
  }

  const { error } = await supabase.from(table).delete().eq("id", itemId).eq("tenant_id", tenantId);
  if (error) {
    console.error(`[MC API DELETE] Supabase error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[MC API DELETE] Success: ${resource}/${itemId}`);
  return new NextResponse(null, { status: 204 });
}
