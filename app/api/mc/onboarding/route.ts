import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { resolveTenantId, ensureTenant } from "@/lib/mc/tenant";
import { auth } from "@clerk/nextjs/server";

const BACKEND_URL =
  process.env.MC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MC_BACKEND_URL ??
  "";

export async function GET() {
  try {
    const { tenantId, userId } = await resolveTenantId();
    const { orgId } = await auth();
    await ensureTenant(tenantId, userId, orgId);

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("tenants")
      .select("onboarding_completed, onboarding_intent")
      .eq("id", tenantId)
      .single();

    return NextResponse.json({
      completed: data?.onboarding_completed ?? false,
      intent: data?.onboarding_intent ?? null,
    });
  } catch {
    return NextResponse.json({ completed: false, intent: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await resolveTenantId();
    const { orgId } = await auth();
    await ensureTenant(tenantId, userId, orgId);

    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // 1. Update onboarding state in tenants table
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("completed" in body) update.onboarding_completed = body.completed;
    if ("intent" in body) update.onboarding_intent = body.intent;

    const { error } = await supabase.from("tenants").update(update).eq("id", tenantId);

    if (error) {
      console.error("[Onboarding] Supabase update failed:", error.message);
      return NextResponse.json({ error: "Failed to update onboarding state" }, { status: 500 });
    }

    // 2. Persist gateway + model settings to MC backend
    const settingsPayload: Record<string, unknown> = {};
    const preferences: Record<string, unknown> = {};

    if (body.gateway_url) {
      // Validate gateway URL to prevent SSRF
      try {
        const gwUrl = new URL(String(body.gateway_url));
        if (!["http:", "https:"].includes(gwUrl.protocol)) {
          return NextResponse.json({ error: "Invalid gateway URL protocol" }, { status: 400 });
        }
        // Block internal/private IPs
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
    if (body.gateway_token) {
      preferences.gatewayToken = body.gateway_token;
    }
    if (body.default_model) {
      preferences.leadBoardAgent = {
        model: body.default_model,
        provider: inferProvider(body.default_model),
      };
    }

    if (BACKEND_URL && (Object.keys(settingsPayload).length > 0 || Object.keys(preferences).length > 0)) {
      if (Object.keys(preferences).length > 0) {
        settingsPayload.preferences = preferences;
      }
      // Get Clerk token for backend auth
      const { getToken } = await auth();
      const token = await getToken();
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
        // Non-blocking — onboarding still completes, user can reconfigure in settings
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
