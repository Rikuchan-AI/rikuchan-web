import { auth } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { FlagsList } from "./flags-list";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

async function getFlags() {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/feature-flags`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = await res.json();
  return body.data || [];
}

export default async function AdminFeatureFlagsPage() {
  const flags = await getFlags();

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Feature Flags</h1>
        </div>
        <FlagsList initialFlags={flags} />
      </div>
    </AdminShell>
  );
}
