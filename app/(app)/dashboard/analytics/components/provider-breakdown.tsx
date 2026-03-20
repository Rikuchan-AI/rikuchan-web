"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ProviderBreakdown as ProviderBreakdownType } from "@/lib/gateway";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { formatUSD, formatNumber } from "@/lib/format";

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#e2783e",
  openai: "#74aa9c",
  google: "#4285f4",
  deepseek: "#a855f7",
  xai: "#ef4444",
  mistral: "#f59e0b",
  unknown: "#71717a",
};

function getColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? "#a855f7";
}

export function ProviderBreakdownSection({
  data,
  locale = "pt-BR",
}: {
  data: ProviderBreakdownType;
  locale?: Locale;
}) {
  if (data.providers.length === 0) return null;

  const chartData = data.providers.map((p) => ({
    name: p.provider,
    value: p.requests,
    cost: p.cost_usd,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Provider donut */}
      <section className="rounded-lg border border-line bg-surface p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">
          {t(locale, "providers.title")}
        </p>
        <div className="mt-4" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()} requests`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.providers.map((p) => (
            <div key={p.provider} className="flex items-center gap-1.5 text-xs text-foreground-soft">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getColor(p.provider) }}
              />
              <span className="capitalize">{p.provider}</span>
              <span className="text-foreground-muted">{p.pct_of_total.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Model table */}
      <section className="rounded-lg border border-line bg-surface p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">
          {t(locale, "models.title")}
        </p>
        <div className="mt-4 space-y-2">
          {data.models.map((m) => (
            <div
              key={m.model}
              className="flex items-center justify-between rounded-md border border-line bg-surface-muted p-3"
            >
              <div>
                <span className="font-mono text-sm font-medium text-foreground">{m.model}</span>
                <span className="ml-2 text-xs capitalize text-foreground-muted">{m.provider}</span>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {m.requests.toLocaleString()} reqs &middot; {formatNumber(m.tokens_in + m.tokens_out)} tokens
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-accent">
                {formatUSD(m.cost_usd)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
