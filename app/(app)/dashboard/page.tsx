import { Button } from "@/components/shared/button";
import { MetricCard } from "@/components/dashboard/metric-card";

const metrics = [
  { label: "Requests today", value: "184", helper: "Across people and agent workflows" },
  { label: "Context hit rate", value: "68%", helper: "Trusted context used when relevant" },
  { label: "Estimated spend", value: "$24.80", helper: "Visible across provider paths" },
] as const;

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.5rem] border border-line/80 bg-white/72 p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Recommended next steps</p>
          <h2 className="mt-4 text-[1.7rem] font-semibold text-foreground">Get the workspace ready for first value</h2>
          <div className="mt-6 space-y-3">
            {[
              "Create your first API key",
              "Connect a provider or keep the shared starter path",
              "Add a first knowledge source",
              "Send a first request and confirm the flow",
            ].map((step) => (
              <div key={step} className="flex gap-3 rounded-[1.1rem] border border-line/80 bg-background-strong/80 p-4 text-sm text-foreground-soft">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/dashboard/api-keys" size="lg">
              Create API key
            </Button>
            <Button href="/dashboard/settings" variant="secondary" size="lg">
              Open settings
            </Button>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-line/80 bg-white/72 p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">Operational status</p>
          <div className="mt-6 space-y-4">
            {[
              ["Provider access", "Connected"],
              ["Knowledge sources", "1 source ready"],
              ["Workspace plan", "Starter"],
              ["Team access", "Owner only"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[1rem] bg-background-strong/80 p-4">
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
