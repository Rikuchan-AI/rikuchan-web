import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { Mascot } from "@/components/shared/mascot";
import { SectionShell } from "@/components/shared/section-shell";

type SignupCtaSectionProps = {
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  reassurance: string;
};

export function SignupCtaSection({
  title,
  description,
  primaryCta,
  secondaryCta,
  reassurance,
}: SignupCtaSectionProps) {
  return (
    <SectionShell tone="cta">
      <Container>
        <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-surface px-6 py-10 text-center sm:px-10 sm:py-14 hero-gradient">
          <div className="flex justify-center mb-5">
            <Mascot size="md" glow />
          </div>
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Your AI, Your Knowledge</p>
          <h2 className="mx-auto mt-5 max-w-[15ch] text-[2.4rem] leading-[1.02] font-semibold text-foreground sm:text-[3rem]">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-[680px] text-[1rem] leading-8 text-foreground-soft sm:text-[1.05rem]">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href={primaryCta.href} size="lg">
              {primaryCta.label}
            </Button>
            <Button href={secondaryCta.href} variant="secondary" size="lg">
              {secondaryCta.label}
            </Button>
          </div>
          <p className="mt-5 text-sm text-foreground-muted">{reassurance}</p>
        </div>
      </Container>
    </SectionShell>
  );
}
