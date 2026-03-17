"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { UseCase } from "@/content/marketing/home";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";
import { cn } from "@/lib/utils";

type UseCasesSectionProps = {
  title: string;
  description: string;
  items: readonly UseCase[];
};

export function UseCasesSection({ title, description, items }: UseCasesSectionProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <SectionShell id="use-cases" tone="muted">
      <Container>
        <SectionHeading title={title} description={description} />
        <div className="mt-10 space-y-4">
          <div className="hidden flex-wrap gap-2 md:flex">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition cursor-pointer",
                  activeItem.id === item.id
                    ? "border-accent/20 bg-accent-soft text-accent"
                    : "border-line bg-surface text-foreground-soft hover:text-foreground hover:bg-surface-strong",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:hidden">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "rounded-lg border px-4 py-4 text-left text-sm font-medium transition cursor-pointer",
                  activeItem.id === item.id
                    ? "border-accent/20 bg-accent-soft text-accent"
                    : "border-line bg-surface text-foreground-soft",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border-b border-line p-6 lg:border-r lg:border-b-0 lg:p-8">
                <p className="mono text-xs uppercase tracking-[0.18em] text-accent">{activeItem.label}</p>
                <h3 className="mt-5 text-[2rem] leading-[1.06] font-semibold text-foreground">{activeItem.title}</h3>
                <p className="mt-5 max-w-[560px] text-[1rem] leading-8 text-foreground-soft">{activeItem.body}</p>
                <div className="mt-7">
                  <Button href={activeItem.cta.href} size="lg">
                    {activeItem.cta.label}
                  </Button>
                </div>
              </div>
              <div className="bg-surface-muted p-6 lg:p-8">
                <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">What matters most</p>
                <ul className="mt-5 space-y-3">
                  {activeItem.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 rounded-lg bg-surface p-4 text-sm text-foreground-soft">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </SectionShell>
  );
}
