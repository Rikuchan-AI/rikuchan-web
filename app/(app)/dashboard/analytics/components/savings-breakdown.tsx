import type { SavingsBreakdown as SavingsBreakdownType, SavingsVector } from "@/lib/gateway";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { formatUSD } from "@/lib/format";
import { ConfidenceBadge } from "./confidence-badge";

const VECTOR_ICONS: Record<string, string> = {
  cache: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375",
  routing: "M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  trimming: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
};

const TOOLTIP_KEYS: Record<string, string> = {
  cache: "tooltip.cache_savings",
  routing: "tooltip.routing_savings",
  trimming: "tooltip.trimming_savings",
};

export function SavingsBreakdown({
  savings,
  locale = "pt-BR",
}: {
  savings: SavingsBreakdownType;
  locale?: Locale;
}) {
  if (savings.vectors.length === 0) return null;

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">
        {locale === "pt-BR" ? "Breakdown de economia" : "Savings breakdown"}
      </p>
      <div className="mt-4 space-y-3">
        {savings.vectors.map((vector) => (
          <VectorCard key={vector.vector} vector={vector} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function VectorCard({ vector, locale }: { vector: SavingsVector; locale: Locale }) {
  const iconPath = VECTOR_ICONS[vector.vector] || VECTOR_ICONS.cache;
  const description = locale === "pt-BR" ? vector.description_pt : vector.description_en;
  const tooltipKey = TOOLTIP_KEYS[vector.vector];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <svg
            className="h-5 w-5 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {t(locale, `savings.${vector.vector}`)}
          </p>
          <p className="mt-0.5 text-xs text-foreground-soft">{description}</p>
          <p className="mt-1 text-xs text-foreground-muted">
            {vector.request_count.toLocaleString()} requests
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:text-right">
        <div>
          <p className="font-mono text-lg font-semibold text-accent">
            {formatUSD(vector.savings_usd)}
          </p>
          <p className="text-xs text-foreground-muted">{vector.pct_of_total.toFixed(1)}%</p>
        </div>
        <ConfidenceBadge
          level={vector.confidence}
          tooltip={tooltipKey ? t(locale, tooltipKey) : undefined}
          locale={locale}
        />
      </div>
    </div>
  );
}
