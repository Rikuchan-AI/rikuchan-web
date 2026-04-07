import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

export async function GET() {
  try {
    const { getToken } = await auth();
    const token = await getToken();

    const res = await fetch(`${API_URL}/api/tenants/me`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ plan: "free", display_name: "Free" });
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ plan: "free", display_name: "Free" });
  }
}
