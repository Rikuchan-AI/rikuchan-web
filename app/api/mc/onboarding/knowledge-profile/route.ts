import { NextRequest, NextResponse } from "next/server";
import { resolveTenantId, ensureTenant } from "@/lib/mc/tenant";
import { auth } from "@clerk/nextjs/server";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

const BACKEND_URL =
  process.env.RIKUCHAN_API_URL ??
  process.env.MC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MC_BACKEND_URL ??
  "";

export async function POST(req: NextRequest) {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const { tenantId, userId } = await resolveTenantId();
    const { orgId } = await auth();
    await ensureTenant(tenantId, userId, orgId);

    const body = await req.json();

    if (!BACKEND_URL) {
      return NextResponse.json({ error: "MC backend not configured" }, { status: 503 });
    }

    const { getToken } = await auth();
    const token = await getToken();

    const res = await fetch(`${BACKEND_URL}/api/knowledge-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error?.message || `Backend error (${res.status})` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create knowledge profile" }, { status: 500 });
  }
}
