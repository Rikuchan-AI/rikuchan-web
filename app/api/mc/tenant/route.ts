import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { resolveTenantId, ensureTenant } from "@/lib/mc/tenant";

export async function GET() {
  try {
    const { tenantId, userId } = await resolveTenantId();
    const supabase = getSupabaseAdmin();

    // Ensure tenant exists (auto-provision on first access)
    const { orgId } = await import("@clerk/nextjs/server").then((m) => m.auth());
    await ensureTenant(tenantId, userId, orgId);

    // Fetch tenant + plan info in one go
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, type, plan, name, slug, suspended")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ plan: "free", display_name: "Free" });
    }

    const { data: planData } = await supabase
      .from("tenant_plans")
      .select("display_name, limits, features, price_usd")
      .eq("plan", tenant.plan)
      .single();

    return NextResponse.json({
      tenantId: tenant.id,
      type: tenant.type,
      plan: tenant.plan,
      display_name: planData?.display_name || "Free",
      name: tenant.name,
      suspended: tenant.suspended,
      limits: planData?.limits || {},
      features: planData?.features || {},
      price_usd: planData?.price_usd || 0,
    });
  } catch {
    return NextResponse.json({ plan: "free", display_name: "Free" });
  }
}
