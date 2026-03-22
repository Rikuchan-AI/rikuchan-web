import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { requireStaff } from "@/lib/mc/staff";
import { invalidateFlagsCache } from "@/lib/mc/feature-flags";

export async function POST(req: NextRequest) {
  await requireStaff();
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("feature_flags").insert({
    key: body.key,
    description: body.description || null,
    enabled_globally: false,
    enabled_plans: [],
    enabled_tenants: [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateFlagsCache();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  await requireStaff();
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("enabled_globally" in body) update.enabled_globally = body.enabled_globally;
  if ("enabled_plans" in body) update.enabled_plans = body.enabled_plans;
  if ("enabled_tenants" in body) update.enabled_tenants = body.enabled_tenants;

  const { error } = await supabase.from("feature_flags").update(update).eq("key", body.key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
