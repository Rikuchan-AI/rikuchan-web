"use client";

import { useState } from "react";
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
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  activeItem.id === item.id
                    ? "border-accent/20 bg-accent-soft text-accent-deep"
                    : "border-line/80 bg-white/64 text-foreground-soft hover:text-foreground",
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
                  "rounded-[1.2rem] border px-4 py-4 text-left text-sm font-medium transition",
                  activeItem.id === item.id
                    ? "border-accent/20 bg-accent-soft text-accent-deep"
                    : "border-line/80 bg-white/64 text-foreground-soft",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border-b border-line/70 p-6 lg:border-r lg:border-b-0 lg:p-8">
                <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">{activeItem.label}</p>
                <h3 className="mt-5 text-[2rem] leading-[1.06] font-semibold text-foreground">{activeItem.title}</h3>
                <p className="mt-5 max-w-[560px] text-[1rem] leading-8 text-foreground-soft">{activeItem.body}</p>
                <div className="mt-7">
                  <Button href={activeItem.cta.href} size="lg">
                    {activeItem.cta.label}
                  </Button>
                </div>
              </div>
              <div className="surface-muted p-6 lg:p-8">
                <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">What matters most</p>
                <ul className="mt-5 space-y-3">
                  {activeItem.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 rounded-[1rem] bg-white/72 p-4 text-sm text-foreground-soft">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
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
