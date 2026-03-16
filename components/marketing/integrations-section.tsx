import { Badge } from "@/components/shared/badge";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SectionShell } from "@/components/shared/section-shell";

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
              <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">Compatibility</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {items.map((item) => (
                  <Badge key={item} tone="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="grid gap-px bg-line/70 lg:grid-cols-3">
                {["People", "Apps", "Agents"].map((label) => (
                  <div key={label} className="bg-white/76 p-5">
                    <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">{label}</p>
                    <p className="mt-4 text-[1rem] font-semibold text-foreground">One trusted path into AI</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/72 p-6 sm:p-7">
                <div className="flex flex-col gap-4 rounded-[1.35rem] border border-line/70 bg-background-strong/75 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Rikuchan layer</span>
                  <span className="text-sm text-foreground-soft">Trusted context • Routing • Usage visibility</span>
                  <span className="rounded-full bg-accent-soft px-4 py-2 text-sm font-medium text-accent-deep">
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
