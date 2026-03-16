import { Button } from "@/components/shared/button";

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-line/80 bg-white/72 p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Workspace settings</p>
        <h2 className="mt-4 text-[1.75rem] font-semibold text-foreground">Keep the admin area clean and operational</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            Workspace name
            <input
              type="text"
              defaultValue="Rikuchan Starter"
              className="mt-2 w-full rounded-[1rem] border border-line-strong bg-background-strong px-4 py-3 text-sm text-foreground outline-none"
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Primary email
            <input
              type="email"
              defaultValue="owner@rikuchan.ai"
              className="mt-2 w-full rounded-[1rem] border border-line-strong bg-background-strong px-4 py-3 text-sm text-foreground outline-none"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg">Save changes</Button>
          <Button variant="secondary" size="lg">
            Manage provider connections
          </Button>
        </div>
      </section>
      <section className="rounded-[1.5rem] border border-[#cc8178]/35 bg-[#fff4f2]/70 p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-[#9d4f48]">Danger zone</p>
        <h3 className="mt-4 text-xl font-semibold text-foreground">Workspace deletion stays intentionally hard</h3>
        <p className="mt-3 max-w-[720px] text-sm leading-7 text-foreground-soft">
          Keep destructive actions separate from normal admin tasks so the settings page remains clear and low-risk.
        </p>
        <div className="mt-6">
          <Button variant="secondary" size="lg" className="border-[#cc8178]/40 bg-white text-[#9d4f48] hover:bg-[#fff1ee]">
            Delete workspace
          </Button>
        </div>
      </section>
    </div>
  );
}
