import type { TrustItem } from "@/content/marketing/home";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";
import { TrustGrid } from "@/components/shared/trust-grid";

type TrustSectionProps = {
  title: string;
  description: string;
  items: readonly TrustItem[];
};

export function TrustSection({ title, description, items }: TrustSectionProps) {
  return (
    <SectionShell id="trust" tone="muted">
      <Container>
        <SectionHeading title={title} description={description} />
        <div className="mt-10">
          <TrustGrid items={items} />
        </div>
      </Container>
    </SectionShell>
  );
}
