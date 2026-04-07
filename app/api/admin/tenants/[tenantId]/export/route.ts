import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mc/staff";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  await requireStaff();
  const { tenantId } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API_URL}/api/admin/tenants/${tenantId}/export`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return NextResponse.json({ error: "Export failed" }, { status: 500 });
  const data = await res.json();

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gdpr-export-${tenantId}-${Date.now()}.json"`,
    },
  });
}
