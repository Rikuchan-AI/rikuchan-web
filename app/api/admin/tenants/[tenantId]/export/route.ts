import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mc/staff";
import { exportTenantData } from "@/lib/mc/gdpr";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";

type Params = { params: Promise<{ tenantId: string }> };

/**
 * GDPR Data Export (Article 20 — Data Portability).
 * Returns a JSON file with all tenant data.
 * Staff-only endpoint.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const staffUserId = await requireStaff();
  const { tenantId } = await params;

  const data = await exportTenantData(tenantId);

  // Audit the export
  const supabase = getSupabaseAdmin();
  await supabase.from("backoffice_audit").insert({
    staff_user_id: staffUserId,
    action: "gdpr_export",
    target_tenant_id: tenantId,
    details: { table_count: Object.keys(data.tables).length },
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gdpr-export-${tenantId}-${Date.now()}.json"`,
    },
  });
}
