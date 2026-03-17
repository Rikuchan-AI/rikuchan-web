import type { FlowStep } from "@/content/marketing/home";
import { Card } from "@/components/shared/card";

type StepFlowProps = {
  steps: readonly FlowStep[];
};

export function StepFlow({ steps }: StepFlowProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {steps.map((step) => (
        <Card key={step.step} className="relative overflow-hidden glow-card">
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent">{step.step}</p>
          <h3 className="mt-8 text-2xl font-semibold text-foreground">{step.title}</h3>
          <p className="mt-4 leading-7 text-foreground-soft">{step.body}</p>
        </Card>
      ))}
    </div>
  );
}
