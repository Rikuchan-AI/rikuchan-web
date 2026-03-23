"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist";
import { useGatewayStore } from "@/lib/mc/gateway-store";

type Overview = { requests_today: number; context_hit_rate_pct: number; estimated_spend_usd: number; active_providers: string[] };
type Workspace = { name: string; plan: string; providers_connected: number; knowledge_sources: number };

export default function DashboardOverviewPage() {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const gatewayConfig = useGatewayStore((s) => s.config);
  const [overview, setOverview] = useState<Overview>({ requests_today: 0, context_hit_rate_pct: 0, estimated_spend_usd: 0, active_providers: [] });
  const [workspace, setWorkspace] = useState<Workspace>({ name: "Rikuchan", plan: "starter", providers_connected: 0, knowledge_sources: 0 });

  useEffect(() => {
    if (gatewayStatus !== "connected" || !gatewayConfig.url) return;
    const gwUrl = gatewayConfig.url.replace("ws://", "http://").replace("wss://", "https://");
    fetch(`${gwUrl}/dashboard/api/overview`).then((r) => r.ok ? r.json() : null).then((d) => { if (d) setOverview(d); }).catch(() => {});
    fetch(`${gwUrl}/v1/settings/workspace`).then((r) => r.ok ? r.json() : null).then((d) => { if (d) setWorkspace(d); }).catch(() => {});
  }, [gatewayStatus, gatewayConfig.url]);

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
