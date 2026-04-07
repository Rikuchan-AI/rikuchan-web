"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AnalyticsTimeline } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { formatUSD, shortDate } from "@/lib/format";

export function SavingsTimeline({
  timeline,
  locale = "pt-BR",
}: {
  timeline: AnalyticsTimeline;
  locale?: Locale;
}) {
  if (timeline.points.length === 0) return null;

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">
        {t(locale, "timeline.title")}
      </p>
      <div className="mt-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatUSD(v, 0)}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
              labelFormatter={(label) => shortDate(String(label))}
              formatter={(value, name) => [
                formatUSD(Number(value)),
                name === "cost_without_gateway_usd"
                  ? locale === "pt-BR" ? "Sem Rikuchan" : "Without Rikuchan"
                  : locale === "pt-BR" ? "Com Rikuchan" : "With Rikuchan",
              ]}
            />
            <Area
              type="monotone"
              dataKey="cost_without_gateway_usd"
              stroke="#f87171"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="none"
              name="cost_without_gateway_usd"
            />
            <Area
              type="monotone"
              dataKey="cost_usd"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#savingsGradient)"
              name="cost_usd"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
