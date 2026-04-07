import type { Insight } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { ConfidenceBadge } from "./confidence-badge";

const TYPE_ICONS: Record<string, string> = {
  savings_milestone: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
  cache_opportunity: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  model_recommendation: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  cost_trend: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
};

export function InsightsPanel({
  insights,
  locale = "pt-BR",
}: {
  insights: Insight[];
  locale?: Locale;
}) {
  if (insights.length === 0) return null;

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">
        {t(locale, "insights.title")}
      </p>
      <div className="mt-4 space-y-3">
        {insights.map((insight, idx) => {
          const title = locale === "pt-BR" ? insight.title_pt : insight.title_en;
          const description = locale === "pt-BR" ? insight.description_pt : insight.description_en;
          const iconPath = TYPE_ICONS[insight.type] || TYPE_ICONS.cost_trend;

          return (
            <div
              key={idx}
              className="flex gap-3 rounded-md border border-line bg-surface-muted p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <svg
                  className="h-4 w-4 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <ConfidenceBadge level={insight.confidence} locale={locale} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground-soft">{description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
