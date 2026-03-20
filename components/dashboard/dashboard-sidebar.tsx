"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/shared/logo-lockup";
import { cn } from "@/lib/utils";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

const platformLinks = [
  { label: "Overview", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "API keys", href: "/dashboard/api-keys" },
  { label: "Billing", href: "/dashboard/billing" },
  { label: "Plans", href: "/dashboard/plans" },
  { label: "Settings", href: "/dashboard/settings" },
] as const;

const mcLinks = [
  { label: "Agents", href: "/agents" },
  { label: "Projects", href: "/agents/projects" },
  { label: "Groups", href: "/agents/groups" },
  { label: "Chat", href: "/agents/chat" },
  { label: "Sessions", href: "/agents/sessions" },
  { label: "Gateway", href: "/agents/gateway" },
  { label: "MC Settings", href: "/agents/settings" },
] as const;

function NavLink({
  href,
  label,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block rounded-md px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-accent-soft text-accent"
          : "text-foreground-soft hover:bg-surface-strong hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col border-r border-line bg-surface p-5 lg:sticky lg:top-0">
      <LogoLockup href="/" />

      {/* Mission Control */}
      {MC_ENABLED && (
        <div className="mt-8 space-y-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
            Mission Control
          </p>
          {mcLinks.map((link) => (
            <NavLink key={link.href} {...link} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {/* Platform */}
      <div className={cn(MC_ENABLED ? "mt-6" : "mt-8", "space-y-1")}>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted">
          Platform
        </p>
        {platformLinks.map((link) => (
          <NavLink key={link.href} {...link} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-line bg-surface-muted p-4">
        <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">Workspace</p>
        <p className="mt-3 text-sm font-semibold text-foreground">Rikuchan Starter</p>
        <p className="mt-1 text-sm leading-6 text-foreground-soft">
          Operational area for API access, billing, and workspace controls.
        </p>
      </div>
    </div>
  );
}
