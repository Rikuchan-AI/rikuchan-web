import { homePageContent } from "@/content/marketing/home";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata = {
  title: "How It Works",
};

export default function HowItWorksPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="From request to result"
        title="A simple path from prompt to grounded output"
        description="Rikuchan sits between requests and model providers so context, routing, and usage stay intentional instead of improvised."
      />
      <HowItWorksSection
        title={homePageContent.howItWorks.title}
        description={homePageContent.howItWorks.description}
        steps={homePageContent.howItWorks.steps}
      />
      <SectionShell>
        <Container>
          <div className="rounded-xl border border-line bg-surface p-7 sm:p-9">
            <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Macro flow</p>
            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              {["Request enters gateway", "Trusted context is evaluated", "Best-fit model path is selected", "Usage stays visible"].map((item) => (
                <div key={item} className="rounded-lg border border-line bg-surface-muted p-5 text-sm text-foreground-soft">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </SectionShell>
      <IntegrationsSection
        title={homePageContent.integrations.title}
        description={homePageContent.integrations.description}
        items={homePageContent.integrations.items}
      />
      <FinalCtaSection
        title={homePageContent.finalCta.title}
        description={homePageContent.finalCta.description}
        primaryCta={homePageContent.finalCta.primaryCta}
        secondaryCta={homePageContent.finalCta.secondaryCta}
      />
    </>
  );
}
