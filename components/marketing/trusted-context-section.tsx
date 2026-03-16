import type { ComparisonSide } from "@/content/marketing/home";
import { Badge } from "@/components/shared/badge";
import { ComparisonPanel } from "@/components/shared/comparison-panel";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";

type TrustedContextSectionProps = {
  title: string;
  description: string;
  sourceLabels: readonly string[];
  left: ComparisonSide;
  right: ComparisonSide;
};

export function TrustedContextSection({
  title,
  description,
  sourceLabels,
  left,
  right,
}: TrustedContextSectionProps) {
  return (
    <SectionShell tone="highlight">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
          <div>
            <SectionHeading title={title} description={description} />
            <div className="mt-8 flex flex-wrap gap-2">
              {sourceLabels.map((label) => (
                <Badge key={label} tone="accent">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <ComparisonPanel left={left} right={right} />
        </div>
      </Container>
    </SectionShell>
  );
}
