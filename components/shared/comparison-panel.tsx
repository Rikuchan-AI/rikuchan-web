import type { ComparisonSide } from "@/content/marketing/home";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";

type ComparisonPanelProps = {
  left: ComparisonSide;
  right: ComparisonSide;
};

export function ComparisonPanel({ left, right }: ComparisonPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[left, right].map((side) => (
        <Card key={side.title} className="h-full">
          <Badge tone={side === right ? "accent" : "neutral"}>{side.eyebrow}</Badge>
          <h3 className="mt-5 text-xl font-semibold text-foreground">{side.title}</h3>
          <p className="mt-4 leading-7 text-foreground-soft">{side.body}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {side.meta.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full border border-line/80 bg-white/60 px-3 py-1 text-xs text-foreground-soft"
              >
                {item}
              </span>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
