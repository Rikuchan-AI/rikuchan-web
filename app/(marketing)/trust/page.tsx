import { homePageContent } from "@/content/marketing/home";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";
import { TrustSection } from "@/components/marketing/trust-section";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata = {
  title: "Trust",
};

export default function TrustPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Trust and security"
        title="Built to make AI usage easier to control"
        description="Rikuchan keeps provider access behind the platform, surfaces usage signals, and gives teams a cleaner way to work with grounded AI."
      />
      <TrustSection
        title={homePageContent.trust.title}
        description={homePageContent.trust.description}
        items={homePageContent.trust.items}
      />
      <SectionShell>
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            {["Protected credentials", "Operational visibility", "A cleaner rollout path"].map((item) => (
              <div key={item} className="rounded-lg border border-line bg-surface p-6 text-sm leading-7 text-foreground-soft">
                <p className="text-lg font-semibold text-foreground">{item}</p>
                <p className="mt-3">
                  Use a more intentional AI setup instead of loosely connected prompts, tools, and provider keys.
                </p>
              </div>
            ))}
          </div>
        </Container>
      </SectionShell>
      <FinalCtaSection
        title="Bring trusted context and clearer control into one layer"
        description="Start with a lightweight account and keep the path to wider rollout open as your AI workflows mature."
        primaryCta={{ label: "Create free account", href: "/signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  );
}
