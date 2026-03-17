import { Sparkles, TrendingDown, Layers } from "lucide-react";
import type { ValuePillar } from "@/content/marketing/home";
import { GlowCard } from "@/components/shared/glow-card";
import { IconBox } from "@/components/shared/icon-box";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";

const pillarIcons = [Sparkles, TrendingDown, Layers];

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
          {items.map((item, i) => {
            const Icon = pillarIcons[i % pillarIcons.length];
            return (
              <GlowCard key={item.title} className="h-full">
                <IconBox icon={Icon} />
                <h3 className="mt-6 text-[1.45rem] leading-tight font-semibold text-foreground">{item.title}</h3>
                <p className="mt-4 leading-7 text-foreground-soft">{item.body}</p>
              </GlowCard>
            );
          })}
        </div>
      </Container>
    </SectionShell>
  );
}
