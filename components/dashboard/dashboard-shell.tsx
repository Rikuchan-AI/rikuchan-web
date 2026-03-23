"use client";

import { useEffect, useState } from "react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { usePermissions } from "@/hooks/use-permissions";

const segmentLabels: Record<string, string> = {
  dashboard: "Overview",
  analytics: "Analytics",
  "api-keys": "API Keys",
  billing: "Billing",
  plans: "Plans",
  settings: "Settings",
  agents: "Agents",
  projects: "Projects",
  board: "Board",
  groups: "Groups",
  chat: "Chat",
  sessions: "Sessions",
  gateway: "Gateway",
};

/** Map specific full paths to override labels */
function labelForSegment(segment: string, fullPath: string): string {
  // /agents/settings has a special label
  if (fullPath.startsWith("/agents") && segment === "settings") {
    return "MC Settings";
  }
  return segmentLabels[segment] ?? segment;
}

function isIdSegment(segment: string): boolean {
  // UUIDs, numeric IDs, or anything that doesn't appear in our known labels
  return (
    !segmentLabels[segment] &&
    (segment.length > 8 || /^[0-9a-f-]+$/i.test(segment))
  );
}

function Breadcrumbs() {
  const pathname = usePathname();

  // Remove leading slash and split
  const segments = pathname.replace(/^\//, "").split("/").filter(Boolean);

  if (segments.length === 0) return null;

  // Build breadcrumb items from segments
  const items: { label: string; href: string }[] = [];
  let cumulativePath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    cumulativePath += `/${segment}`;

    if (isIdSegment(segment)) {
      // Dynamic segment — show "Project" as placeholder
      items.push({ label: "Project", href: cumulativePath });
    } else {
      items.push({
        label: labelForSegment(segment, cumulativePath),
        href: cumulativePath,
      });
    }
  }

  return (
    <nav className="flex items-center gap-1" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                size={8}
                className="text-foreground-muted"
                aria-hidden
              />
            )}
            {isLast ? (
              <span className="text-sm font-semibold text-foreground">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function RoleBadge() {
  const { role, isPersonal } = usePermissions();
  if (isPersonal) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
      role === "admin"
        ? "bg-accent/10 text-accent border-accent/20"
        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
    }`}>
      {role}
    </span>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
            <Breadcrumbs />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleBadge />
            {mounted && (
              <>
                <OrganizationSwitcher
                  appearance={clerkAppearance}
                  afterSelectOrganizationUrl="/dashboard"
                  afterSelectPersonalUrl="/dashboard"
                  hidePersonal={false}
                />
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-9 w-9",
                    },
                  }}
                />
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 animate-fade-in">
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
