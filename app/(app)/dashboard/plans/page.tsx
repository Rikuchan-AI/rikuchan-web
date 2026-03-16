import { Button } from "@/components/shared/button";

const planCards = [
  { name: "Starter", detail: "Free", status: "Current plan" },
  { name: "Team", detail: "$49/mo", status: "Upgrade path" },
  { name: "Scale", detail: "Custom", status: "Sales-assisted" },
] as const;

export default function DashboardPlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Plans</p>
        <h2 className="mt-3 text-[1.8rem] font-semibold text-foreground">Choose the next level only when the workflow earns it</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {planCards.map((plan, index) => (
          <div key={plan.name} className="rounded-[1.5rem] border border-line/80 bg-white/72 p-6">
            <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">{plan.status}</p>
            <h3 className="mt-5 text-[1.7rem] font-semibold text-foreground">{plan.name}</h3>
            <p className="mt-2 text-sm text-foreground-soft">{plan.detail}</p>
            <div className="mt-6">
              <Button variant={index === 0 ? "secondary" : "primary"} size="lg" className="w-full justify-center">
                {index === 0 ? "Current plan" : index === 1 ? "Upgrade to Team" : "Talk to us"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
