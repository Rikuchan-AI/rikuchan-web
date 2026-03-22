import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { AdminShell } from "@/components/admin/admin-shell";

async function getUsageData() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenant_usage")
    .select("*")
    .order("date", { ascending: false })
    .limit(100);
  return data || [];
}

export default async function AdminUsagePage() {
  const usage = await getUsageData();

  // Aggregate by tenant
  const byTenant = new Map<string, { tokens: number; requests: number; cost: number }>();
  for (const row of usage) {
    const existing = byTenant.get(row.tenant_id) || { tokens: 0, requests: 0, cost: 0 };
    existing.tokens += Number(row.tokens_consumed);
    existing.requests += row.requests_count;
    existing.cost += Number(row.estimated_cost_usd);
    byTenant.set(row.tenant_id, existing);
  }

  const sorted = [...byTenant.entries()].sort((a, b) => b[1].cost - a[1].cost);

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usage</h1>

        <div className="rounded-lg border border-line bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-strong">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Tenant</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-muted">Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-muted">Requests</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-muted">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(([tenantId, data]) => (
                <tr key={tenantId} className="border-b border-line/50">
                  <td className="px-4 py-3 font-mono text-xs text-foreground-soft">{tenantId.slice(0, 20)}...</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{data.tokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{data.requests.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">${data.cost.toFixed(2)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-foreground-muted">
                    No usage data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
