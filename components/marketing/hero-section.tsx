import type { HeroContent } from "@/content/marketing/home";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { AppPreviewFrame } from "@/components/shared/app-preview-frame";
import { SectionShell } from "@/components/shared/section-shell";

type HeroSectionProps = {
  content: HeroContent;
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <SectionShell tone="hero" className="pb-18 sm:pb-20 lg:pb-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-16">
          <div>
            <Badge tone="accent">{content.eyebrow}</Badge>
            <h1 className="mt-6 max-w-[12ch] text-[3rem] leading-[0.94] font-semibold text-foreground sm:text-[4rem] lg:text-[5.2rem]">
              {content.title}
            </h1>
            <p className="mt-7 max-w-[620px] text-[1.05rem] leading-8 text-foreground-soft sm:text-[1.12rem]">
              {content.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={content.primaryCta.href} size="lg">
                {content.primaryCta.label}
              </Button>
              <Button href={content.secondaryCta.href} variant="secondary" size="lg">
                {content.secondaryCta.label}
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {content.proofItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white/66 px-4 py-2 text-sm text-foreground-soft"
                >
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <AppPreviewFrame className="lg:translate-y-3">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[1.25fr_0.9fr]">
                <Card className="border-white/80 bg-white/78">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="accent">Grounded response</Badge>
                    <span className="mono text-xs uppercase tracking-[0.14em] text-foreground-soft">Live preview</span>
                  </div>
                  <h2 className="mt-5 text-[1.35rem] font-semibold text-foreground">
                    Quarterly planning, with the right business context already in place
                  </h2>
                  <p className="mt-4 leading-7 text-foreground-soft">
                    Pull relevant policy notes, project priorities, and support learnings into the request only when they improve the outcome.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["Policy handbook", "Planning memo", "Team notes"].map((item) => (
                      <span key={item} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-deep">
                        {item}
                      </span>
                    ))}
                  </div>
                </Card>
                <Card className="border-white/80 bg-white/78">
                  <p className="mono text-xs uppercase tracking-[0.14em] text-foreground-soft">Routing and usage</p>
                  <div className="mt-5 space-y-4">
                    {[
                      ["Context used", "Only when relevant"],
                      ["Model path", "Adaptive"],
                      ["Usage visibility", "Cost + latency"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-line/70 bg-white/72 p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-foreground-soft">{label}</p>
                        <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className="rounded-[1.4rem] border border-line/70 bg-[linear-gradient(135deg,rgba(15,139,120,0.12),rgba(255,255,255,0.75))] p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Prompt bloat", "-37%"],
                    ["Grounded answers", "Higher fit"],
                    ["AI layer", "People + agents"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[1.15rem] bg-white/72 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-foreground-soft">{label}</p>
                      <p className="metric-number mt-2 text-[1.4rem] font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AppPreviewFrame>
        </div>
      </Container>
    </SectionShell>
  );
}
