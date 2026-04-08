import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";
const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

const BACKEND_URL =
  process.env.MC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MC_BACKEND_URL ??
  "";

export async function GET() {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const { getToken } = await auth();
    const token = await getToken();

    const res = await fetch(`${API_URL}/api/tenants/onboarding`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return NextResponse.json(await res.json());
    }
    return NextResponse.json({ completed: false, intent: null });
  } catch {
    return NextResponse.json({ completed: false, intent: null });
  }
}

export async function POST(req: NextRequest) {
  if (!MC_ENABLED) {
    return NextResponse.json({ error: "Mission Control is disabled" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { getToken, userId } = await auth();
    const token = await getToken();

    console.log("[Onboarding] POST auth debug:", {
      hasToken: !!token,
      tokenLength: token?.length,
      userId,
      apiUrl: API_URL,
    });

    // 1. Update onboarding state via rikuchan-api
    const apiRes = await fetch(`${API_URL}/api/tenants/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        completed: body.completed,
        intent: body.intent,
      }),
      signal: AbortSignal.timeout(5000),
    });

    console.log("[Onboarding] API response:", { status: apiRes.status, ok: apiRes.ok });

    // 2. Persist gateway + model settings to MC backend
    const settingsPayload: Record<string, unknown> = {};
    const preferences: Record<string, unknown> = {};

    if (body.gateway_url) {
      try {
        const gwUrl = new URL(String(body.gateway_url));
        if (!["http:", "https:"].includes(gwUrl.protocol)) {
          return NextResponse.json({ error: "Invalid gateway URL protocol" }, { status: 400 });
        }
        const hostname = gwUrl.hostname.toLowerCase();
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" ||
            hostname.startsWith("10.") || hostname.startsWith("172.") || hostname.startsWith("192.168.") ||
            hostname === "[::1]" || hostname.endsWith(".internal") || hostname === "metadata.google.internal") {
          if (process.env.NODE_ENV === "production") {
            return NextResponse.json({ error: "Gateway URL cannot point to internal addresses" }, { status: 400 });
          }
        }
        settingsPayload.gatewayUrl = gwUrl.toString();
      } catch {
        return NextResponse.json({ error: "Invalid gateway URL" }, { status: 400 });
      }
    }
    if (body.gateway_token) preferences.gatewayToken = body.gateway_token;
    if (body.default_model) {
      preferences.leadBoardAgent = {
        model: body.default_model,
        provider: inferProvider(body.default_model),
      };
    }

    if (BACKEND_URL && (Object.keys(settingsPayload).length > 0 || Object.keys(preferences).length > 0)) {
      if (Object.keys(preferences).length > 0) settingsPayload.preferences = preferences;
      try {
        await fetch(`${BACKEND_URL}/api/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(settingsPayload),
          signal: AbortSignal.timeout(5000),
        });
      } catch (err) {
        console.error("[Onboarding] Failed to save settings to backend:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update onboarding state" }, { status: 500 });
  }
}

function inferProvider(model: string): string {
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gemini-")) return "google";
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
  return "unknown";
}
