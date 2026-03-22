import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { requireStaff } from "@/lib/mc/staff";
import { invalidatePlanCache } from "@/lib/mc/plan-limits";

type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const staffUserId = await requireStaff();
  const { tenantId } = await params;
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const { action, ...data } = body;

  if (action === "suspend") {
    await supabase.from("tenants").update({ suspended: true, updated_at: new Date().toISOString() }).eq("id", tenantId);
  } else if (action === "unsuspend") {
    await supabase.from("tenants").update({ suspended: false, updated_at: new Date().toISOString() }).eq("id", tenantId);
  } else if (action === "change_plan" && data.plan) {
    await supabase.from("tenants").update({ plan: data.plan, updated_at: new Date().toISOString() }).eq("id", tenantId);
    invalidatePlanCache(tenantId);
  }

  // Audit log
  await supabase.from("backoffice_audit").insert({
    staff_user_id: staffUserId,
    action: action || "update",
    target_tenant_id: tenantId,
    details: body,
  });

  return NextResponse.json({ ok: true });
}
