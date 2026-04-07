import type { AnalyticsSummary } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { formatUSD, periodLabel } from "@/lib/format";
import { ConfidenceBadge } from "./confidence-badge";

export function AnalyticsHero({
  summary,
  locale = "pt-BR",
}: {
  summary: AnalyticsSummary;
  locale?: Locale;
}) {
  const roiDisplay = summary.roi != null ? `${summary.roi}x` : t(locale, "roi.free");

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent">
            {t(locale, "hero.title")}
          </p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-[2.5rem] font-bold leading-none text-accent sm:text-[3rem]">
              {formatUSD(summary.total_savings_usd)}
            </span>
            <span className="text-sm text-foreground-soft">
              {t(locale, "hero.subtitle", { period: periodLabel(summary.period) })}
            </span>
          </div>
          {summary.savings_pct > 0 && (
            <p className="mt-2 text-sm text-foreground-soft">
              {summary.savings_pct.toFixed(1)}%{" "}
              {locale === "pt-BR"
                ? "menos do que custaria sem o Rikuchan"
                : "less than it would cost without Rikuchan"}
            </p>
          )}
        </div>
        <ConfidenceBadge
          level="measured"
          tooltip={t(locale, "tooltip.total_savings")}
          locale={locale}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MiniMetric
          label={t(locale, "cost.without")}
          value={formatUSD(summary.total_cost_without_gateway_usd)}
          muted
        />
        <MiniMetric
          label={t(locale, "cost.with")}
          value={formatUSD(summary.total_cost_usd)}
        />
        <MiniMetric
          label={t(locale, "roi.label")}
          value={roiDisplay}
          highlight={summary.roi != null && summary.roi >= 1}
          tooltip={t(locale, "tooltip.roi")}
        />
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  muted,
  highlight,
  tooltip,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        highlight
          ? "border-accent/30 bg-accent/5"
          : "border-line bg-surface-muted"
      }`}
      title={tooltip}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-foreground-soft">{label}</p>
      <p
        className={`mt-2 font-mono text-xl font-semibold ${
          muted ? "text-foreground-muted" : highlight ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
