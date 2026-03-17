import { Globe, Users, Bot } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";

const layerIcons = { People: Users, Apps: Globe, Agents: Bot };

type IntegrationsSectionProps = {
  title: string;
  description: string;
  items: readonly string[];
};

export function IntegrationsSection({ title, description, items }: IntegrationsSectionProps) {
  return (
    <SectionShell>
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
          <SectionHeading title={title} description={description} />
          <div className="space-y-4">
            <Card>
              <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Compatibility</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {items.map((item) => (
                  <Badge key={item} tone="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="grid gap-px bg-line lg:grid-cols-3">
                {(["People", "Apps", "Agents"] as const).map((label) => {
                  const Icon = layerIcons[label];
                  return (
                    <div key={label} className="bg-surface p-5">
                      <Icon className="h-5 w-5 text-accent mb-3" />
                      <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">{label}</p>
                      <p className="mt-4 text-[1rem] font-semibold text-foreground">One trusted path into AI</p>
                    </div>
                  );
                })}
              </div>
              <div className="bg-surface p-6 sm:p-7">
                <div className="flex flex-col gap-4 rounded-lg border border-accent/20 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="mono text-xs uppercase tracking-[0.18em] text-accent">Rikuchan layer</span>
                  <span className="text-sm text-foreground-soft">Trusted context &bull; Routing &bull; Usage visibility</span>
                  <span className="rounded-md bg-accent/10 border border-accent/15 px-4 py-2 text-sm font-medium text-accent">
                    Shared foundation
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
