import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

export async function isFeatureEnabled(tenantId: string, flagKey: string, _tenantPlan?: string): Promise<boolean> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/feature-flags/check?key=${encodeURIComponent(flagKey)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      return data.enabled ?? false;
    }
  } catch {
    // fallback
  }
  return false;
}

export function invalidateFlagsCache(): void {
  // Cache is now server-side in rikuchan-api — no local cache to invalidate
}
