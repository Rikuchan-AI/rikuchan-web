import { homePageContent } from "@/content/marketing/home";
import { EfficiencySection } from "@/components/marketing/efficiency-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import { SignupCtaSection } from "@/components/marketing/signup-cta-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { TrustedContextSection } from "@/components/marketing/trusted-context-section";
import { UseCasesSection } from "@/components/marketing/use-cases-section";
import { ValuePillarsSection } from "@/components/marketing/value-pillars-section";

export default function HomePage() {
  return (
    <>
      <HeroSection content={homePageContent.hero} />
      <ValuePillarsSection
        title={homePageContent.valuePillars.title}
        description={homePageContent.valuePillars.description}
        items={homePageContent.valuePillars.items}
      />
      <UseCasesSection
        title={homePageContent.useCases.title}
        description={homePageContent.useCases.description}
        items={homePageContent.useCases.items}
      />
      <HowItWorksSection
        title={homePageContent.howItWorks.title}
        description={homePageContent.howItWorks.description}
        steps={homePageContent.howItWorks.steps}
      />
      <TrustedContextSection
        title={homePageContent.trustedContext.title}
        description={homePageContent.trustedContext.description}
        sourceLabels={homePageContent.trustedContext.sourceLabels}
        left={homePageContent.trustedContext.left}
        right={homePageContent.trustedContext.right}
      />
      <EfficiencySection
        title={homePageContent.efficiency.title}
        description={homePageContent.efficiency.description}
        bullets={homePageContent.efficiency.bullets}
        metrics={homePageContent.efficiency.metrics}
      />
      <IntegrationsSection
        title={homePageContent.integrations.title}
        description={homePageContent.integrations.description}
        items={homePageContent.integrations.items}
      />
      <TrustSection
        title={homePageContent.trust.title}
        description={homePageContent.trust.description}
        items={homePageContent.trust.items}
      />
      <SignupCtaSection
        title={homePageContent.signupCta.title}
        description={homePageContent.signupCta.description}
        primaryCta={homePageContent.signupCta.primaryCta}
        secondaryCta={homePageContent.signupCta.secondaryCta}
        reassurance={homePageContent.signupCta.reassurance}
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
