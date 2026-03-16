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

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="surface-panel flex h-full flex-col rounded-[1.8rem] border border-white/65 p-5 lg:sticky lg:top-6">
      <LogoLockup href="/" compact />
      <div className="mt-8 space-y-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-[1rem] px-4 py-3 text-sm font-medium transition",
                active ? "bg-foreground text-background" : "text-foreground-soft hover:bg-white/74 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto rounded-[1.35rem] border border-line/80 bg-white/64 p-4">
        <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-soft">Workspace</p>
        <p className="mt-3 text-sm font-semibold text-foreground">Rikuchan Starter</p>
        <p className="mt-1 text-sm leading-6 text-foreground-soft">Operational area for API access, billing, and workspace controls.</p>
      </div>
    </div>
  );
}
