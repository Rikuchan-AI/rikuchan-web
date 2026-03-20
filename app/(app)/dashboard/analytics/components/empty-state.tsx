import { Button } from "@/components/shared/button";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function EmptyState({
  type,
  requestCount,
  locale = "pt-BR",
}: {
  type: "no_data" | "collecting" | "insufficient";
  requestCount?: number;
  locale?: Locale;
}) {
  const message =
    type === "insufficient"
      ? t(locale, "empty.insufficient", { n: requestCount ?? 0 })
      : t(locale, `empty.${type}`);

  return (
    <section className="rounded-lg border border-line bg-surface p-12 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
          <svg className="h-8 w-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <p className="text-foreground-soft leading-relaxed">{message}</p>
        {type === "no_data" && (
          <Button href="/dashboard/settings" variant="secondary" size="lg" className="mt-6">
            {locale === "pt-BR" ? "Ir para Configuracoes" : "Go to Settings"}
          </Button>
        )}
      </div>
    </section>
  );
}
