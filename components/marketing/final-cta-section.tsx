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
        <div className="rounded-[2rem] border border-line/70 bg-foreground px-6 py-10 text-background shadow-[0_24px_60px_rgba(16,34,29,0.2)] sm:px-10 sm:py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[720px]">
              <p className="mono text-xs uppercase tracking-[0.18em] text-white/60">Final step</p>
              <h2 className="mt-5 text-[2.3rem] leading-[1.03] font-semibold sm:text-[3.2rem]">{title}</h2>
              <p className="mt-5 max-w-[620px] text-[1rem] leading-8 text-white/70">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={primaryCta.href} size="lg" className="bg-white text-foreground hover:bg-accent-soft">
                {primaryCta.label}
              </Button>
              <Button href={secondaryCta.href} variant="secondary" size="lg" className="border-white/20 bg-white/8 text-white hover:bg-white/14">
                {secondaryCta.label}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
