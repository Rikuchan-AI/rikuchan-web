import { MetricCard } from "@/components/dashboard/metric-card";
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist";
import { getDashboardOverview, getWorkspace } from "@/lib/gateway";

export default async function DashboardOverviewPage() {
  let overview = { requests_today: 0, context_hit_rate_pct: 0, estimated_spend_usd: 0, active_providers: [] as string[] };
  let workspace = { name: "Rikuchan", plan: "starter", providers_connected: 0, knowledge_sources: 0 };

  try {
    overview = await getDashboardOverview();
  } catch { /* gateway offline — show zeros */ }

  try {
    workspace = await getWorkspace();
  } catch { /* fallback */ }

  const metrics = [
    { label: "Requests today", value: String(overview.requests_today), helper: "Across people and agent workflows" },
    { label: "Context hit rate", value: `${overview.context_hit_rate_pct}%`, helper: "Trusted context used when relevant" },
    { label: "Estimated spend", value: `$${overview.estimated_spend_usd.toFixed(2)}`, helper: "Visible across provider paths" },
  ];

  const providerLabel = overview.active_providers.length > 0 ? "Connected" : "Not connected";
  const knowledgeLabel = workspace.knowledge_sources > 0 ? `${workspace.knowledge_sources} source${workspace.knowledge_sources > 1 ? "s" : ""} ready` : "No sources";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <GettingStartedChecklist />
        <div className="rounded-lg border border-line bg-surface p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Operational status</p>
          <div className="mt-6 space-y-3">
            {[
              ["Provider access", providerLabel],
              ["Knowledge sources", knowledgeLabel],
              ["Workspace plan", workspace.plan.charAt(0).toUpperCase() + workspace.plan.slice(1)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-line bg-surface-muted p-4">
                <span className="text-sm text-foreground-soft">{label}</span>
                <span className="text-sm font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
