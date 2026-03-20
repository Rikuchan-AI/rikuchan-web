"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/shared/logo-lockup";
import { cn } from "@/lib/utils";

const links = [
  { label: "Overview", href: "/dashboard" },
  { label: "API keys", href: "/dashboard/api-keys" },
  { label: "Billing", href: "/dashboard/billing" },
  { label: "Plans", href: "/dashboard/plans" },
  { label: "Settings", href: "/dashboard/settings" },
] as const;

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface p-5 lg:sticky lg:top-0">
      <LogoLockup href="/" compact />
      <div className="mt-8 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-md px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-accent-soft text-accent" : "text-foreground-soft hover:bg-surface-strong hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto rounded-lg border border-line bg-surface-muted p-4">
        <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Workspace</p>
        <p className="mt-3 text-sm font-semibold text-foreground">Rikuchan Starter</p>
        <p className="mt-1 text-sm leading-6 text-foreground-soft">Operational area for API access, billing, and workspace controls.</p>
      </div>
    </div>
  );
}
