import { Suspense } from "react";
import {
  getAnalyticsSummary,
  getAnalyticsTimeline,
  getSavingsBreakdown,
  getProviderBreakdown,
  getAnalyticsInsights,
  type AnalyticsSummary,
  type AnalyticsTimeline,
  type SavingsBreakdown,
  type ProviderBreakdown,
  type Insight,
} from "@/lib/gateway";
import { AnalyticsHero } from "./components/analytics-hero";
import { SavingsTimeline } from "./components/savings-timeline";
import { SavingsBreakdown as SavingsBreakdownSection } from "./components/savings-breakdown";
import { ProviderBreakdownSection } from "./components/provider-breakdown";
import { InsightsPanel } from "./components/insights-panel";
import { PeriodSelector } from "./components/period-selector";
import { EmptyState } from "./components/empty-state";

const DEFAULT_SUMMARY: AnalyticsSummary = {
  period: "30d",
  total_requests: 0,
  total_cost_usd: 0,
  total_cost_without_gateway_usd: 0,
  total_savings_usd: 0,
  savings_pct: 0,
  avg_latency_ms: 0,
  cache_hit_rate: 0,
  rag_usage_rate: 0,
  error_rate: 0,
  roi: null,
  plan: "starter",
  plan_price_usd: 0,
  data_confidence: "collecting",
  request_count_threshold_met: false,
};

const DEFAULT_TIMELINE: AnalyticsTimeline = { period: "30d", points: [] };
const DEFAULT_SAVINGS: SavingsBreakdown = { total_savings_usd: 0, vectors: [] };
const DEFAULT_PROVIDERS: ProviderBreakdown = { providers: [], models: [] };
const DEFAULT_INSIGHTS: { insights: Insight[] } = { insights: [] };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = params.period || "30d";

  const [summary, timeline, savings, providers, insights] = await Promise.all([
    getAnalyticsSummary(period).catch(() => DEFAULT_SUMMARY),
    getAnalyticsTimeline(period).catch(() => DEFAULT_TIMELINE),
    getSavingsBreakdown(period).catch(() => DEFAULT_SAVINGS),
    getProviderBreakdown(period).catch(() => DEFAULT_PROVIDERS),
    getAnalyticsInsights(period).catch(() => DEFAULT_INSIGHTS),
  ]);

  // Empty states
  if (summary.total_requests === 0) {
    return (
      <div className="space-y-6">
        <Header period={period} />
        <EmptyState type="no_data" />
      </div>
    );
  }

  if (summary.data_confidence === "collecting") {
    return (
      <div className="space-y-6">
        <Header period={period} />
        <EmptyState type="collecting" />
      </div>
    );
  }

  if (!summary.request_count_threshold_met) {
    return (
      <div className="space-y-6">
        <Header period={period} />
        <EmptyState type="insufficient" requestCount={summary.total_requests} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header period={period} />
      <AnalyticsHero summary={summary} />
      <SavingsTimeline timeline={timeline} />
      {summary.plan !== "starter" && savings.vectors.length > 0 && (
        <SavingsBreakdownSection savings={savings} />
      )}
      {summary.plan === "starter" && savings.vectors.length > 0 && (
        <UpgradePrompt />
      )}
      <ProviderBreakdownSection data={providers} />
      <InsightsPanel insights={insights.insights} />
    </div>
  );
}

function Header({ period }: { period: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
        Analytics
      </h2>
      <Suspense>
        <PeriodSelector current={period} />
      </Suspense>
    </div>
  );
}

function UpgradePrompt() {
  return (
    <section className="rounded-lg border border-dashed border-accent/30 bg-accent/5 p-6 text-center">
      <p className="text-sm font-medium text-accent">Disponivel no plano Team</p>
      <p className="mt-1 text-xs text-foreground-soft">
        Faca upgrade para ver o breakdown detalhado de economia por vetor
      </p>
      <a
        href="/dashboard/plans"
        className="mt-3 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-accent-deep"
      >
        Ver planos
      </a>
    </section>
  );
}
