import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

type SimplePageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function SimplePageHeader({ eyebrow, title, description }: SimplePageHeaderProps) {
  return (
    <SectionShell tone="hero" className="pb-10 sm:pb-12 lg:pb-16">
      <Container>
        <div className="max-w-[760px]">
          {eyebrow ? (
            <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">{eyebrow}</p>
          ) : null}
          <h1 className="mt-5 text-[3rem] leading-[0.95] font-semibold text-foreground sm:text-[4rem]">{title}</h1>
          <p className="mt-6 max-w-[680px] text-[1.05rem] leading-8 text-foreground-soft sm:text-[1.1rem]">
            {description}
          </p>
        </div>
      </Container>
    </SectionShell>
  );
}
