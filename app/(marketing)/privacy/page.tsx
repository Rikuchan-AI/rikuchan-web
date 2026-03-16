import { SimplePageHeader } from "@/components/marketing/simple-page-header";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Privacy"
        title="Privacy details can stay simple at this stage"
        description="This placeholder page gives the footer a real destination and can be replaced with formal policy text when legal copy is ready."
      />
      <SectionShell>
        <Container>
          <div className="max-w-[760px] rounded-[1.5rem] border border-line/80 bg-white/72 p-6 text-sm leading-8 text-foreground-soft sm:p-8">
            A formal privacy policy should describe account data, workspace metadata, billing information, and operational usage signals.
          </div>
        </Container>
      </SectionShell>
    </>
  );
}
