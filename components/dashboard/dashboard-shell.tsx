import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <DashboardSidebar />
        </aside>
        <div className="min-h-full">
          <header className="flex flex-col gap-4 border-b border-line bg-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <h1 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Dashboard</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-line-strong bg-transparent px-4 text-sm font-medium text-foreground hover:bg-surface-strong"
              >
                Invite teammate
              </Link>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
              >
                Back to site
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10 ring-1 ring-line-strong",
                  },
                }}
              />
            </div>
          </header>
          <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
