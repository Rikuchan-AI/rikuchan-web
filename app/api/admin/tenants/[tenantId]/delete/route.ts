import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mc/staff";
import { deleteTenantData, exportTenantData } from "@/lib/mc/gdpr";
import { suspendTenantGateway } from "@/lib/mc/gateway-provision";

type Params = { params: Promise<{ tenantId: string }> };

/**
 * GDPR Data Deletion (Article 17 — Right to Erasure).
 * Exports data first (for compliance), then deletes/anonymizes.
 * Staff-only endpoint. Requires explicit confirmation.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const staffUserId = await requireStaff();
  const { tenantId } = await params;
  const body = await req.json();

  if (body.confirm !== tenantId) {
    return NextResponse.json(
      { error: "Confirmation required: send { confirm: tenantId } in body" },
      { status: 400 },
    );
  }

  // Step 1: Export before deletion (compliance requirement)
  const exportData = await exportTenantData(tenantId);

  // Step 2: Suspend dedicated gateway if exists
  try {
    await suspendTenantGateway(tenantId);
  } catch {
    // Gateway may not exist for this tenant — OK
  }

  // Step 3: Delete/anonymize data
  const result = await deleteTenantData(tenantId, staffUserId);

  return NextResponse.json({
    ok: true,
    ...result,
    export_record_count: Object.values(exportData.tables).reduce(
      (sum, t) => sum + t.count,
      0,
    ),
  });
}
