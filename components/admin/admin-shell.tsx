"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Flag, LayoutDashboard, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Users },
  { label: "Usage", href: "/admin/usage", icon: BarChart3 },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-screen bg-background">
      <div className="hidden w-[240px] flex-shrink-0 border-r border-line bg-surface p-5 lg:block lg:sticky lg:top-0 lg:min-h-screen">
        <div className="flex items-center gap-2 mb-8">
          <Shield size={20} className="text-red-400" />
          <span className="text-lg font-semibold text-foreground tracking-tight">Back Office</span>
        </div>

        <nav className="space-y-1">
          {adminLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-red-500/10 text-red-400 border-l-2 border-red-400"
                    : "text-foreground-soft hover:bg-surface-strong hover:text-foreground",
                )}
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <Link href="/dashboard" className="text-xs text-foreground-muted hover:text-foreground-soft transition">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400 border border-red-500/20">
              Staff Only
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
