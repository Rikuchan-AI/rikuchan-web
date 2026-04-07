import { auth } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/admin/admin-shell";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

async function getOverviewMetrics() {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/overview`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) return { totalTenants: 0, totalProjects: 0, planCounts: {} };
  return res.json();
}

export default async function AdminOverviewPage() {
  const metrics = await getOverviewMetrics();

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Platform Overview</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Tenants" value={metrics.totalTenants} />
          <MetricCard label="Total Projects" value={metrics.totalProjects} />
          <MetricCard label="Free" value={metrics.planCounts.free || 0} />
          <MetricCard label="Paid" value={(metrics.planCounts.starter || 0) + (metrics.planCounts.team || 0) + (metrics.planCounts.enterprise || 0)} />
        </div>

        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">Plan Distribution</h2>
          <div className="space-y-2">
            {Object.entries(metrics.planCounts).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between text-sm">
                <span className="text-foreground-soft capitalize">{plan}</span>
                <span className="font-mono text-foreground">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
