import type { FlowStep } from "@/content/marketing/home";
import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";
import { StepFlow } from "@/components/shared/step-flow";

type HowItWorksSectionProps = {
  title: string;
  description: string;
  steps: readonly FlowStep[];
};

export function HowItWorksSection({ title, description, steps }: HowItWorksSectionProps) {
  return (
    <SectionShell id="how-it-works">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading title={title} description={description} />
          <div className="flex gap-3">
            <Button href="/developers" variant="secondary" size="lg">
              View API
            </Button>
            <Button href="/how-it-works" variant="ghost" size="lg">
              Read the full flow
            </Button>
          </div>
        </div>
        <div className="mt-10">
          <StepFlow steps={steps} />
        </div>
      </Container>
    </SectionShell>
  );
}
