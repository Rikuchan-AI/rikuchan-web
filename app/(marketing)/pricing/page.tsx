import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";

export const metadata = {
  title: "Pricing",
};

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For individual evaluation and early workflow setup.",
    features: ["One workspace", "Basic API access", "Initial usage visibility"],
  },
  {
    name: "Team",
    price: "$49/mo",
    description: "For teams that want more consistent, business-aware AI usage.",
    features: ["Shared workspace controls", "More usage capacity", "Team-ready operational tooling"],
  },
  {
    name: "Scale",
    price: "Custom",
    description: "For companies that want a stronger operational foundation and guided rollout.",
    features: ["Higher limits", "Expanded support", "Sales-assisted rollout"],
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Pricing and plans"
        title="Choose the level of control and capacity you need"
        description="Start simply, prove value quickly, and expand only when the workflow justifies it."
      />
      <SectionShell>
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <Card key={plan.name} className={index === 1 ? "border-accent/20" : ""}>
                <p className="mono text-xs uppercase tracking-[0.18em] text-accent">{plan.name}</p>
                <h2 className="mt-5 text-[2.35rem] font-semibold text-foreground">{plan.price}</h2>
                <p className="mt-3 leading-7 text-foreground-soft">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-foreground-soft">
                      <span className="mt-2 h-2 w-2 rounded-full bg-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button href={plan.name === "Scale" ? "/trust" : "/signup"} size="lg" variant={index === 1 ? "primary" : "secondary"}>
                    {plan.name === "Scale" ? "Talk to us" : "Start free"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </SectionShell>
    </>
  );
}
