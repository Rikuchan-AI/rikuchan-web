import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";
const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

/**
 * POST /api/mc/files
 * Upload a file via rikuchan-api.
 * Body: FormData with fields: file, projectId, taskId
 */
export async function POST(req: NextRequest) {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const { getToken } = await auth();
    const token = await getToken();

    // Forward the multipart form data directly
    const formData = await req.formData();

    const res = await fetch(`${API_URL}/api/files`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error?.message || `Upload failed (${res.status})` },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    console.error("[files] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/mc/files?path=...
 * Get a signed download URL via rikuchan-api.
 */
export async function GET(req: NextRequest) {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const filePath = req.nextUrl.searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "path parameter required" }, { status: 400 });
    }

    const res = await fetch(`${API_URL}/api/files?path=${encodeURIComponent(filePath)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(await res.json());
  } catch (err: unknown) {
    console.error("[files] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
