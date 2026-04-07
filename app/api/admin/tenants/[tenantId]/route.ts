import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mc/staff";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

type Params = { params: Promise<{ tenantId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireStaff();
  const { tenantId } = await params;
  const body = await req.json();
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API_URL}/api/admin/tenants/${tenantId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
