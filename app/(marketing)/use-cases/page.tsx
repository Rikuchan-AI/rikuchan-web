import { homePageContent } from "@/content/marketing/home";
import { SignupCtaSection } from "@/components/marketing/signup-cta-section";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";
import { UseCasesSection } from "@/components/marketing/use-cases-section";

export const metadata = {
  title: "Use Cases",
};

export default function UseCasesPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Who it serves"
        title="One AI layer, several paths to value"
        description="The same foundation can support individual productivity, team workflows, business-aware AI, and more structured agent-based systems."
      />
      <UseCasesSection
        title={homePageContent.useCases.title}
        description={homePageContent.useCases.description}
        items={homePageContent.useCases.items}
      />
      <SignupCtaSection
        title={homePageContent.signupCta.title}
        description={homePageContent.signupCta.description}
        primaryCta={homePageContent.signupCta.primaryCta}
        secondaryCta={homePageContent.signupCta.secondaryCta}
        reassurance={homePageContent.signupCta.reassurance}
      />
    </>
  );
}
