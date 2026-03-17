import { Zap, Clock, Code, ArrowRight } from "lucide-react";
import type { HeroContent } from "@/content/marketing/home";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { GradientHeading } from "@/components/shared/gradient-heading";
import { Mascot } from "@/components/shared/mascot";
import { SectionShell } from "@/components/shared/section-shell";

const proofIcons = [Zap, Clock, Code];

type HeroSectionProps = {
  content: HeroContent;
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <SectionShell tone="hero" className="pb-18 sm:pb-20 lg:pb-24">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-16">
          {/* Text column */}
          <div>
            <Badge tone="accent">{content.eyebrow}</Badge>
            <GradientHeading
              as="h1"
              className="mt-6 max-w-[12ch] text-[3rem] leading-[0.94] sm:text-[4rem] lg:text-[5.2rem]"
            >
              {content.title}
            </GradientHeading>
            <p className="mt-7 max-w-[620px] text-[1.05rem] leading-8 text-foreground-soft sm:text-[1.12rem]">
              {content.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={content.primaryCta.href} size="lg">
                {content.primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button href={content.secondaryCta.href} variant="secondary" size="lg">
                {content.secondaryCta.label}
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {content.proofItems.map((item, i) => {
                const Icon = proofIcons[i % proofIcons.length];
                return (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm text-foreground-soft"
                  >
                    <Icon className="h-3.5 w-3.5 text-accent" />
                    {item}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Architecture diagram */}
          <div className="relative rounded-xl border border-line bg-[#0a0a0a] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="ml-2 mono text-xs text-foreground-muted">gateway.rikuchan.dev</span>
            </div>

            {/* Flow diagram */}
            <div className="flex items-center justify-between gap-3">
              {/* Clients */}
              <div className="flex flex-col gap-2">
                {["Claude", "Cursor", "Codex"].map((client) => (
                  <div
                    key={client}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs text-foreground-soft"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {client}
                  </div>
                ))}
              </div>

              {/* Beam left */}
              <div className="flex-1 flex items-center">
                <div className="h-px w-full bg-gradient-to-r from-accent/40 to-accent/80" />
                <div className="h-2 w-2 -ml-1 rotate-45 border-r border-t border-accent/80" />
              </div>

              {/* Gateway center */}
              <div className="flex flex-col items-center gap-2 rounded-lg border border-accent/20 bg-accent-soft px-4 py-3">
                <Mascot size="sm" glow />
                <span className="mono text-[0.65rem] uppercase tracking-[0.14em] text-accent">Gateway</span>
              </div>

              {/* Beam right */}
              <div className="flex-1 flex items-center">
                <div className="h-px w-full bg-gradient-to-r from-accent/80 to-accent/40" />
                <div className="h-2 w-2 -ml-1 rotate-45 border-r border-t border-accent/40" />
              </div>

              {/* Providers */}
              <div className="flex flex-col gap-2">
                {["Anthropic", "OpenAI", "Google"].map((provider) => (
                  <div
                    key={provider}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs text-foreground-soft"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-warm" />
                    {provider}
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics strip */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Latency", "+23ms"],
                ["RAG hits", "94%"],
                ["Cost saved", "37%"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-line bg-surface p-3">
                  <p className="text-[0.65rem] uppercase tracking-[0.12em] text-foreground-muted">{label}</p>
                  <p className="metric-number mt-1 text-sm font-semibold text-accent">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
