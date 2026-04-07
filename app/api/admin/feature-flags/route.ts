import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/mc/staff";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

async function apiCall(path: string, method: string, body?: unknown) {
  const { getToken } = await auth();
  const token = await getToken();
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
}

export async function POST(req: NextRequest) {
  await requireStaff();
  const body = await req.json();
  const res = await apiCall("/api/feature-flags", "POST", body);
  if (!res.ok) return NextResponse.json({ error: "Failed to create flag" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  await requireStaff();
  const body = await req.json();
  const res = await apiCall("/api/feature-flags", "PATCH", body);
  if (!res.ok) return NextResponse.json({ error: "Failed to update flag" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await requireStaff();
  const body = await req.json();
  const res = await apiCall("/api/feature-flags", "DELETE", body);
  if (!res.ok) return NextResponse.json({ error: "Failed to delete flag" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
