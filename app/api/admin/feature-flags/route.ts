import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { requireStaff } from "@/lib/mc/staff";
import { invalidateFlagsCache } from "@/lib/mc/feature-flags";

export async function POST(req: NextRequest) {
  await requireStaff();
  const body = await req.json();

  // Validate required fields
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!key || key.length > 100) {
    return NextResponse.json({ error: "Invalid flag key" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("feature_flags").insert({
    key,
    description: typeof body.description === "string" ? body.description.slice(0, 500) : null,
    enabled_globally: false,
    enabled_plans: [],
    enabled_tenants: [],
  });

  if (error) {
    console.error("[feature-flags] Insert failed:", error.message);
    return NextResponse.json({ error: "Failed to create flag" }, { status: 500 });
  }
  invalidateFlagsCache();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  await requireStaff();
  const body = await req.json();

  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "Flag key is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("enabled_globally" in body) update.enabled_globally = Boolean(body.enabled_globally);
  if ("enabled_plans" in body && Array.isArray(body.enabled_plans)) update.enabled_plans = body.enabled_plans;
  if ("enabled_tenants" in body && Array.isArray(body.enabled_tenants)) update.enabled_tenants = body.enabled_tenants;

  const { error } = await supabase.from("feature_flags").update(update).eq("key", key);
  if (error) {
    console.error("[feature-flags] Update failed:", error.message);
    return NextResponse.json({ error: "Failed to update flag" }, { status: 500 });
  }
  invalidateFlagsCache();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await requireStaff();
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  await supabase.from("feature_flags").delete().eq("key", body.key);
  invalidateFlagsCache();
  return NextResponse.json({ ok: true });
}
