import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { resolveTenantId, ensureTenant } from "@/lib/mc/tenant";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { tenantId, userId } = await resolveTenantId();
    const { orgId } = await auth();
    await ensureTenant(tenantId, userId, orgId);

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("tenants")
      .select("onboarding_completed, onboarding_intent")
      .eq("id", tenantId)
      .single();

    return NextResponse.json({
      completed: data?.onboarding_completed ?? false,
      intent: data?.onboarding_intent ?? null,
    });
  } catch {
    return NextResponse.json({ completed: false, intent: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await resolveTenantId();
    const { orgId } = await auth();
    await ensureTenant(tenantId, userId, orgId);

    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("completed" in body) update.onboarding_completed = body.completed;
    if ("intent" in body) update.onboarding_intent = body.intent;

    await supabase.from("tenants").update(update).eq("id", tenantId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update onboarding state" }, { status: 500 });
  }
}
