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
      {[left, right].map((side) => {
        const isRight = side === right;
        return (
          <Card
            key={side.title}
            className={isRight
              ? "h-full border-accent/20 glow-card"
              : "h-full border-danger/20"
            }
          >
            <Badge tone={isRight ? "accent" : "neutral"}>{side.eyebrow}</Badge>
            <h3 className="mt-5 text-xl font-semibold text-foreground">{side.title}</h3>
            <p className="mt-4 leading-7 text-foreground-soft">{side.body}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {side.meta.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-md border border-line-strong bg-surface-strong px-3 py-1 text-xs text-foreground-soft"
                >
                  {item}
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
