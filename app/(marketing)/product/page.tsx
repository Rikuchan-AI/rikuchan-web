import { homePageContent } from "@/content/marketing/home";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";
import { TrustedContextSection } from "@/components/marketing/trusted-context-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { ValuePillarsSection } from "@/components/marketing/value-pillars-section";

export const metadata = {
  title: "Product",
};

export default function ProductPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Product overview"
        title="A trusted AI layer built around useful outcomes"
        description="Rikuchan improves answer quality, reduces waste, and creates a stronger foundation for AI used by people, teams, and agent-based workflows."
      />
      <ValuePillarsSection
        title={homePageContent.valuePillars.title}
        description={homePageContent.valuePillars.description}
        items={homePageContent.valuePillars.items}
      />
      <TrustedContextSection
        title={homePageContent.trustedContext.title}
        description={homePageContent.trustedContext.description}
        sourceLabels={homePageContent.trustedContext.sourceLabels}
        left={homePageContent.trustedContext.left}
        right={homePageContent.trustedContext.right}
      />
      <TrustSection
        title={homePageContent.trust.title}
        description={homePageContent.trust.description}
        items={homePageContent.trust.items}
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
