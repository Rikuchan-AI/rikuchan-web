import { Check } from "lucide-react";
import type { Metric } from "@/content/marketing/home";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { MetricsStrip } from "@/components/shared/metrics-strip";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";

type EfficiencySectionProps = {
  title: string;
  description: string;
  bullets: readonly string[];
  metrics: readonly Metric[];
};

export function EfficiencySection({ title, description, bullets, metrics }: EfficiencySectionProps) {
  return (
    <SectionShell>
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <div>
            <SectionHeading title={title} description={description} />
            <ul className="mt-8 space-y-4">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 rounded-lg bg-surface p-4 text-sm leading-7 text-foreground-soft border border-line">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line bg-surface-muted p-6 dot-grid sm:p-8">
              <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Efficiency view</p>
              <h3 className="mt-5 text-[2rem] leading-[1.08] font-semibold text-foreground">
                Keep context intentional instead of bloated
              </h3>
              <p className="mt-4 max-w-[600px] text-[1rem] leading-8 text-foreground-soft">
                Model routing, token budgeting, and selective context usage work together so better outcomes do not have to come with uncontrolled spend.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <MetricsStrip metrics={metrics} />
            </div>
          </Card>
        </div>
      </Container>
    </SectionShell>
  );
}
