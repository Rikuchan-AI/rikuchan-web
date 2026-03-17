import { ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

type FinalCtaSectionProps = {
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export function FinalCtaSection({ title, description, primaryCta, secondaryCta }: FinalCtaSectionProps) {
  return (
    <SectionShell className="pt-10 sm:pt-12">
      <Container>
        <div className="rounded-xl border border-line bg-surface px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[720px]">
              <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Final step</p>
              <h2 className="mt-5 text-[2.3rem] leading-[1.03] font-semibold text-foreground sm:text-[3.2rem]">{title}</h2>
              <p className="mt-5 max-w-[620px] text-[1rem] leading-8 text-foreground-soft">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={primaryCta.href} size="lg">
                {primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button href={secondaryCta.href} variant="secondary" size="lg">
                {secondaryCta.label}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
