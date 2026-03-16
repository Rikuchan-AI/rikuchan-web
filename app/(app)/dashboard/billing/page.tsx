import { Button } from "@/components/shared/button";

export default function DashboardBillingPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[1.5rem] border border-line/80 bg-white/72 p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Billing overview</p>
        <h2 className="mt-4 text-[1.75rem] font-semibold text-foreground">Current plan: Starter</h2>
        <p className="mt-3 text-sm leading-7 text-foreground-soft">
          Track current usage, plan status, and the next clean upgrade path without turning billing into a heavy admin experience.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["This month", "$24.80"],
            ["Included usage", "On track"],
            ["Next invoice", "$0.00"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1rem] border border-line/80 bg-background-strong/80 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-foreground-soft">{label}</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[1.5rem] border border-line/80 bg-white/72 p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">Actions</p>
        <div className="mt-5 space-y-3">
          <Button size="lg" className="w-full justify-center">
            Upgrade plan
          </Button>
          <Button variant="secondary" size="lg" className="w-full justify-center">
            Update payment method
          </Button>
          <Button variant="ghost" size="lg" className="w-full justify-center">
            Download invoices
          </Button>
        </div>
      </section>
    </div>
  );
}
