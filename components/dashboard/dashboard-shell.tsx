import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1440px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside>
          <DashboardSidebar />
        </aside>
        <div className="surface-panel min-h-full rounded-[1.8rem] border border-white/65">
          <header className="flex flex-col gap-4 border-b border-line/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Workspace admin</p>
              <h1 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.03em] text-foreground">Rikuchan dashboard</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-white/70 px-4 text-sm font-semibold text-foreground"
              >
                Invite teammate
              </Link>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
              >
                Back to site
              </Link>
            </div>
          </header>
          <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
