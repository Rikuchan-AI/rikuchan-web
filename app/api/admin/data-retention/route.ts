import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mc/staff";
import { enforceRetentionAll, hardPurgeSoftDeletedTenants } from "@/lib/mc/data-retention";

/**
 * Data retention enforcement endpoint.
 * Can be called manually by staff or by a cron job.
 *
 * For cron: set CRON_SECRET env var and pass as Bearer token.
 * For staff: uses Clerk auth via requireStaff().
 */
export async function POST(req: NextRequest) {
  // Allow cron secret OR staff auth
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Cron job auth — proceed
  } else {
    // Staff auth
    await requireStaff();
  }

  const [retentionResults, purgedTenants] = await Promise.all([
    enforceRetentionAll(),
    hardPurgeSoftDeletedTenants(),
  ]);

  return NextResponse.json({
    ok: true,
    retention: {
      tenants_processed: retentionResults.length,
      results: retentionResults,
    },
    hard_purge: {
      tenants_purged: purgedTenants.length,
      tenant_ids: purgedTenants,
    },
  });
}
