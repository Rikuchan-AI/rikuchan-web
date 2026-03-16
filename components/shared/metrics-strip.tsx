import type { Metric } from "@/content/marketing/home";
import { cn } from "@/lib/utils";

type MetricsStripProps = {
  metrics: readonly Metric[];
  className?: string;
};

export function MetricsStrip({ metrics, className }: MetricsStripProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-[1.15rem] border border-line/80 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-foreground-soft">{metric.label}</p>
          <p className="metric-number mt-3 text-[1.35rem] font-semibold text-foreground">{metric.value}</p>
          <p className="mt-1 text-sm text-foreground-soft">{metric.helper}</p>
        </div>
      ))}
    </div>
  );
}
