import { SimplePageHeader } from "@/components/marketing/simple-page-header";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Terms"
        title="Terms can be formalized once the commercial motion is set"
        description="This placeholder exists so the public site structure is complete and production-ready from a navigation standpoint."
      />
      <SectionShell>
        <Container>
          <div className="max-w-[760px] rounded-[1.5rem] border border-line/80 bg-white/72 p-6 text-sm leading-8 text-foreground-soft sm:p-8">
            A formal terms page should define account responsibilities, acceptable usage, billing rules, service expectations, and provider-related limitations.
          </div>
        </Container>
      </SectionShell>
    </>
  );
}
