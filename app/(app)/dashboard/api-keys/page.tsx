import { Button } from "@/components/shared/button";

const keys = [
  { name: "Primary app key", scope: "gateway:read gateway:write", lastUsed: "2 hours ago", status: "Active" },
  { name: "Local agent install", scope: "bootstrap", lastUsed: "Yesterday", status: "Active" },
] as const;

export default function DashboardApiKeysPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">API access</p>
          <h2 className="mt-3 text-[1.8rem] font-semibold text-foreground">Manage workspace API keys</h2>
          <p className="mt-2 max-w-[720px] text-sm leading-7 text-foreground-soft">
            Create keys for apps, local runtimes, and controlled integrations without exposing provider credentials directly.
          </p>
        </div>
        <Button size="lg">Generate key</Button>
      </section>
      <section className="space-y-4">
        {keys.map((key) => (
          <div key={key.name} className="rounded-[1.4rem] border border-line/80 bg-white/72 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{key.name}</h3>
                <p className="mt-1 text-sm text-foreground-soft">{key.scope}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-accent-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-deep">
                  {key.status}
                </span>
                <Button variant="secondary">Copy once</Button>
                <Button variant="ghost">Revoke</Button>
              </div>
            </div>
            <p className="mt-4 text-sm text-foreground-soft">Last used {key.lastUsed}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
