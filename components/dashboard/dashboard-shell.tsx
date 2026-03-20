"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* Sidebar — fixed 260px */}
      <div className="hidden w-[260px] flex-shrink-0 lg:block">
        <DashboardSidebar />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-4 border-b border-line bg-surface px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNav(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong text-foreground-soft hover:bg-surface-strong lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-line-strong bg-transparent px-4 text-sm font-medium text-foreground-soft hover:bg-surface-strong hover:text-foreground transition-colors"
            >
              Invite teammate
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
            >
              Back to site
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>

      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="relative h-full w-72 max-w-[85vw] bg-surface shadow-xl">
            <button
              onClick={() => setMobileNav(false)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground-soft hover:bg-surface-strong"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            <DashboardSidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
