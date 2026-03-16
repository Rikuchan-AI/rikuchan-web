import type { ValuePillar } from "@/content/marketing/home";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";

type ValuePillarsSectionProps = {
  title: string;
  description: string;
  items: readonly ValuePillar[];
};

export function ValuePillarsSection({ title, description, items }: ValuePillarsSectionProps) {
  return (
    <SectionShell id="product">
      <Container>
        <SectionHeading title={title} description={description} />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.title} className="h-full">
              <Badge tone="accent">{item.tag}</Badge>
              <h3 className="mt-6 text-[1.45rem] leading-tight font-semibold text-foreground">{item.title}</h3>
              <p className="mt-4 leading-7 text-foreground-soft">{item.body}</p>
            </Card>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}
