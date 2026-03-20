import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";

type Params = { params: Promise<{ path: string[] }> };

async function requireUser() {
  const { userId } = await auth();
  if (!userId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
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

// GET /api/mc/{resource} — list items
// GET /api/mc/{resource}/{id} — get single item
// GET /api/mc/tasks/{projectId} — list tasks for project
export async function GET(req: NextRequest, { params }: Params) {
  const userId = await requireUser();
  const segments = (await params).path;
  const resource = segments[0];
  const table = TABLE_MAP[resource];
  if (!table) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const supabase = getSupabaseAdmin();

  // Special case: settings (key-value)
  if (resource === "settings") {
    const settingKey = segments[1];
    if (settingKey) {
      const { data } = await supabase
        .from(table)
        .select("setting_value")
        .eq("user_id", userId)
        .eq("setting_key", settingKey)
        .single();
      return NextResponse.json(data?.setting_value ?? null);
    }
    const { data } = await supabase.from(table).select("setting_key,setting_value").eq("user_id", userId);
    return NextResponse.json(data ?? []);
  }

  // Resources with project_id scope (tasks, pipelines, memory-docs, triggers)
  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource) && segments[1]) {
    const projectId = segments[1];
    const { data } = await supabase
      .from(table)
      .select("data")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    return NextResponse.json((data ?? []).map((r: { data: unknown }) => r.data));
  }

  // Chat sessions
  if (resource === "chat-sessions") {
    const { data } = await supabase.from(table).select("session_key,data").eq("user_id", userId);
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
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return NextResponse.json((data ?? []).map((r: { data: unknown }) => r.data));
  }

  // Generic: groups, projects
  const { data } = await supabase
    .from(table)
    .select("data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return NextResponse.json((data ?? []).map((r: { data: unknown }) => r.data));
}

// POST /api/mc/{resource} — create item
export async function POST(req: NextRequest, { params }: Params) {
  const userId = await requireUser();
  const segments = (await params).path;
  const resource = segments[0];
  const table = TABLE_MAP[resource];
  if (!table) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (resource === "settings") {
    const { key, value } = body;
    const { error } = await supabase.from(table).upsert(
      { user_id: userId, setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,setting_key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "chat-sessions") {
    const { sessionKey, data } = body;
    const { error } = await supabase.from(table).upsert(
      { session_key: sessionKey, user_id: userId, data, updated_at: Date.now() },
      { onConflict: "user_id,session_key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "notifications") {
    const { error } = await supabase.from(table).upsert(
      { id: body.id, user_id: userId, data: body, created_at: body.timestamp ?? Date.now() },
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
      { id: body.id, project_id: projectId, user_id: userId, data: body, created_at: body.createdAt ?? now, updated_at: body.updatedAt ?? now },
      { onConflict: "project_id,id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(body);
  }

  // Groups, projects
  const now = Date.now();
  const { error } = await supabase.from(table).upsert(
    { id: body.id, user_id: userId, data: body, created_at: body.createdAt ?? now, updated_at: body.updatedAt ?? now },
    { onConflict: "id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(body);
}

// PATCH /api/mc/{resource}/{id} — update item
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await requireUser();
  const segments = (await params).path;
  const resource = segments[0];
  const itemId = segments[1];
  const table = TABLE_MAP[resource];
  if (!table || !itemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const supabase = getSupabaseAdmin();

  // For project-scoped resources, itemId is projectId, segments[2] is the item id
  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource) && segments[2]) {
    const projectId = itemId;
    const actualId = segments[2];
    // Fetch current, merge, update
    const { data: existing } = await supabase
      .from(table)
      .select("data")
      .eq("project_id", projectId)
      .eq("id", actualId)
      .eq("user_id", userId)
      .single();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const merged = { ...existing.data, ...body, updatedAt: Date.now() };
    const { error } = await supabase
      .from(table)
      .update({ data: merged, updated_at: Date.now() })
      .eq("project_id", projectId)
      .eq("id", actualId)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(merged);
  }

  // Groups, projects
  const { data: existing } = await supabase
    .from(table)
    .select("data")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const merged = { ...existing.data, ...body, updatedAt: Date.now() };
  const { error } = await supabase
    .from(table)
    .update({ data: merged, updated_at: Date.now() })
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(merged);
}

// DELETE /api/mc/{resource}/{id}
export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = await requireUser();
  const segments = (await params).path;
  const resource = segments[0];
  const itemId = segments[1];
  const table = TABLE_MAP[resource];
  if (!table || !itemId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  if (["tasks", "pipelines", "memory-docs", "triggers"].includes(resource) && segments[2]) {
    const projectId = itemId;
    const actualId = segments[2];
    await supabase.from(table).delete().eq("project_id", projectId).eq("id", actualId).eq("user_id", userId);
    return new NextResponse(null, { status: 204 });
  }

  // Delete project and cascade to related data
  if (resource === "projects") {
    await supabase.from("mc_tasks").delete().eq("project_id", itemId).eq("user_id", userId);
    await supabase.from("mc_pipelines").delete().eq("project_id", itemId).eq("user_id", userId);
    await supabase.from("mc_memory_docs").delete().eq("project_id", itemId).eq("user_id", userId);
    await supabase.from("mc_triggers").delete().eq("project_id", itemId).eq("user_id", userId);
  }

  if (resource === "notifications") {
    await supabase.from(table).delete().eq("id", itemId).eq("user_id", userId);
    return new NextResponse(null, { status: 204 });
  }

  if (resource === "chat-sessions") {
    await supabase.from(table).delete().eq("session_key", itemId).eq("user_id", userId);
    return new NextResponse(null, { status: 204 });
  }

  await supabase.from(table).delete().eq("id", itemId).eq("user_id", userId);
  return new NextResponse(null, { status: 204 });
}
