import type { TrustItem } from "@/content/marketing/home";
import { Card } from "@/components/shared/card";

type TrustGridProps = {
  items: readonly TrustItem[];
};

export function TrustGrid({ items }: TrustGridProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((item, index) => (
        <Card key={item.title} className="h-full">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-sm font-semibold text-accent-deep">
            0{index + 1}
          </div>
          <h3 className="mt-6 text-xl font-semibold text-foreground">{item.title}</h3>
          <p className="mt-4 leading-7 text-foreground-soft">{item.body}</p>
        </Card>
      ))}
    </div>
  );
}
