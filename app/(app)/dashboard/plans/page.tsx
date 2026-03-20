import { Button } from "@/components/shared/button";
import { getPlan } from "@/lib/gateway";

const allPlans = [
  {
    name: "Starter",
    detail: "Free",
    features: ["60 RPM rate limit", "1,000 daily requests", "RAG with local agent", "1 knowledge source"],
  },
  {
    name: "Team",
    detail: "$49/mo",
    features: ["300 RPM rate limit", "10,000 daily requests", "Priority RAG", "Unlimited knowledge sources", "Team members"],
  },
  {
    name: "Scale",
    detail: "Custom",
    features: ["Custom rate limits", "Unlimited requests", "Dedicated support", "SLA guarantees", "SSO / SAML"],
  },
] as const;

export default async function DashboardPlansPage() {
  let currentPlan = "starter";
  try {
    const plan = await getPlan();
    currentPlan = plan.plan;
  } catch { /* fallback */ }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Plans</p>
        <h2 className="mt-3 text-[1.8rem] font-semibold text-foreground">Choose the next level only when the workflow earns it</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {allPlans.map((plan) => {
          const isCurrent = plan.name.toLowerCase() === currentPlan;
          return (
            <div key={plan.name} className={`rounded-lg border bg-surface p-6 ${isCurrent ? "border-accent/40" : "border-line"}`}>
              <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">
                {isCurrent ? "Current plan" : plan.name === "Scale" ? "Sales-assisted" : "Upgrade path"}
              </p>
              <h3 className="mt-5 text-[1.7rem] font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-2 text-sm text-foreground-soft">{plan.detail}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground-soft">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  size="lg"
                  className="w-full justify-center"
                >
                  {isCurrent ? "Current plan" : plan.name === "Scale" ? "Talk to us" : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
