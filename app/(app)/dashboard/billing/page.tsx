import { Button } from "@/components/shared/button";
import { getPlan, getUsage, getUsageHistory } from "@/lib/gateway";

export default async function DashboardBillingPage() {
  let plan = { plan: "starter", status: "active", limits: {} as Record<string, unknown> };
  let usage = { total_requests_24h: 0, total_cost_24h: 0, total_tokens_in_24h: 0, total_tokens_out_24h: 0, cost_by_provider: [] as { provider: string; cost_usd: number; requests: number }[], cost_by_model: [] as { model: string; cost_usd: number; requests: number; tokens_in: number; tokens_out: number }[] };
  let history = { days: [] as { date: string; requests: number; cost_usd: number }[] };

  try { plan = await getPlan(); } catch { /* fallback */ }
  try { usage = await getUsage(); } catch { /* fallback */ }
  try { history = await getUsageHistory(30); } catch { /* fallback */ }

  const monthlySpend = history.days.reduce((sum, d) => sum + d.cost_usd, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-line bg-surface p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Billing overview</p>
          <h2 className="mt-4 text-[1.75rem] font-semibold text-foreground">
            Current plan: {plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)}
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground-soft">
            Track current usage, plan status, and the next clean upgrade path without turning billing into a heavy admin experience.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["This month", `$${monthlySpend.toFixed(2)}`],
              ["Today", `$${usage.total_cost_24h.toFixed(2)}`],
              ["Requests (24h)", String(usage.total_requests_24h)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-line bg-surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-foreground-soft">{label}</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-line bg-surface p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">Actions</p>
          <div className="mt-5 space-y-3">
            <Button href="/dashboard/plans" size="lg" className="w-full justify-center">Upgrade plan</Button>
            <Button variant="secondary" size="lg" className="w-full justify-center">Update payment method</Button>
            <Button variant="ghost" size="lg" className="w-full justify-center">Download invoices</Button>
          </div>
        </section>
      </div>

      {/* Usage by provider */}
      {usage.cost_by_provider.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Cost by provider (24h)</p>
          <div className="mt-4 space-y-2">
            {usage.cost_by_provider.map((p) => (
              <div key={p.provider} className="flex items-center justify-between rounded-md border border-line bg-surface-muted p-4">
                <div>
                  <span className="text-sm font-medium text-foreground capitalize">{p.provider}</span>
                  <span className="ml-3 text-sm text-foreground-soft">{p.requests} requests</span>
                </div>
                <span className="font-mono text-sm font-semibold text-accent">${p.cost_usd.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Usage by model */}
      {usage.cost_by_model.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Cost by model (24h)</p>
          <div className="mt-4 space-y-2">
            {usage.cost_by_model.map((m) => (
              <div key={m.model} className="flex items-center justify-between rounded-md border border-line bg-surface-muted p-4">
                <div>
                  <span className="font-mono text-sm font-medium text-foreground">{m.model}</span>
                  <span className="ml-3 text-sm text-foreground-soft">{m.requests} reqs</span>
                  <span className="ml-2 text-xs text-foreground-muted">({(m.tokens_in + m.tokens_out).toLocaleString()} tokens)</span>
                </div>
                <span className="font-mono text-sm font-semibold text-accent">${m.cost_usd.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Usage history */}
      {history.days.length > 0 && (
        <section className="rounded-lg border border-line bg-surface p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Daily spend (last 30 days)</p>
          <div className="mt-4 flex items-end gap-1" style={{ height: "120px" }}>
            {history.days.slice(0, 30).reverse().map((d) => {
              const maxCost = Math.max(...history.days.map((dd) => dd.cost_usd), 0.01);
              const height = Math.max((d.cost_usd / maxCost) * 100, 2);
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-t bg-accent/60 transition-all hover:bg-accent"
                  style={{ height: `${height}%` }}
                  title={`${d.date}: $${d.cost_usd.toFixed(2)} (${d.requests} reqs)`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-foreground-muted">
            <span>{history.days[history.days.length - 1]?.date}</span>
            <span>{history.days[0]?.date}</span>
          </div>
        </section>
      )}
    </div>
  );
}
