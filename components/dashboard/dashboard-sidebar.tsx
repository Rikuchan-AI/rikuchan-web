"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FolderKanban,
  Globe,
  Key,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoLockup } from "@/components/shared/logo-lockup";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useTenantPlan } from "@/hooks/use-tenant-plan";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/mc/permissions";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

const STORAGE_KEY = "rikuchan:sidebar-collapsed";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  requiredPermission?: Permission;
}

const platformLinks: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "API keys", href: "/dashboard/api-keys", icon: Key, requiredPermission: "api_keys.view" },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, requiredPermission: "billing.manage" },
  { label: "Plans", href: "/dashboard/plans", icon: Sparkles, requiredPermission: "billing.manage" },
  { label: "Members", href: "/dashboard/settings/members", icon: UsersRound, requiredPermission: "members.view" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, requiredPermission: "settings.workspace" },
];

const mcLinks: NavItem[] = [
  { label: "Agents", href: "/agents", icon: Users },
  { label: "Projects", href: "/agents/projects", icon: FolderKanban },
  { label: "Groups", href: "/agents/groups", icon: Layers },
  { label: "Sessions", href: "/agents/sessions", icon: Activity },
  { label: "Gateway", href: "/agents/gateway", icon: Globe, requiredPermission: "gateway.configure" },
  { label: "MC Settings", href: "/agents/settings", icon: SlidersHorizontal, requiredPermission: "settings.mc" },
];

const chatLinks: NavItem[] = [
  { label: "Chat", href: "/agents/chat", icon: MessageSquare },
];

interface CollapsedState {
  mc: boolean;
  chat: boolean;
  platform: boolean;
}

function useCollapsedState(): [CollapsedState, (section: keyof CollapsedState) => void] {
  const [collapsed, setCollapsed] = useState<CollapsedState>({ mc: false, chat: false, platform: false });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCollapsed(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const toggle = useCallback((section: keyof CollapsedState) => {
    setCollapsed((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return [collapsed, toggle];
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
  onNavigate?: () => void;
  badge?: React.ReactNode;
}) {
  const active =
    pathname === href ||
    (href !== "/dashboard" && href !== "/agents" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition",
        active
          ? "border-l-2 border-accent bg-accent/[0.08] text-accent"
          : "text-foreground-soft hover:bg-surface-strong hover:text-foreground",
      )}
    >
      <Icon size={16} className="shrink-0" />
      {label}
      {badge && <span className="ml-auto">{badge}</span>}
    </Link>
  );
}

function SectionHeader({
  label,
  collapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mb-2 flex w-full items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-muted transition hover:text-foreground-soft"
    >
      <Chevron size={12} className="shrink-0" />
      {label}
    </button>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="rounded-full bg-accent/10 text-accent text-[9px] font-medium px-1.5 py-0.5 min-w-[18px] text-center">
      {count}
    </span>
  );
}

function GatewayDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full",
        connected ? "bg-emerald-400" : "bg-red-400",
      )}
    />
  );
}

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [collapsed, toggle] = useCollapsedState();
  const { can } = usePermissions();

  const agentCount = useGatewayStore((s) => s.agents.filter((a) => a.status === "online").length);
  const sessionCount = useGatewayStore((s) => s.sessions.filter((s) => s.status === "active").length);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const { planName } = useTenantPlan();

  const mcBadges: Record<string, React.ReactNode> = {
    "/agents": agentCount > 0 ? <CountBadge count={agentCount} /> : undefined,
    "/agents/sessions": sessionCount > 0 ? <CountBadge count={sessionCount} /> : undefined,
    "/agents/gateway": <GatewayDot connected={gatewayStatus === "connected"} />,
  };

  // Filter links by permission — hidden, not grayed out
  const visibleMcLinks = mcLinks.filter((link) => !link.requiredPermission || can(link.requiredPermission));
  const visiblePlatformLinks = platformLinks.filter((link) => !link.requiredPermission || can(link.requiredPermission));

  return (
    <div className="flex min-h-screen flex-col border-r border-line bg-surface p-5 lg:sticky lg:top-0">
      <LogoLockup href="/" />

      {/* Chat */}
      {MC_ENABLED && (
        <div className="mt-8 space-y-1">
          <SectionHeader label="Chat" collapsed={collapsed.chat} onToggle={() => toggle("chat")} />
          {!collapsed.chat &&
            chatLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
        </div>
      )}

      {/* Mission Control */}
      {MC_ENABLED && (
        <div className="mt-6 space-y-1">
          <SectionHeader label="Mission Control" collapsed={collapsed.mc} onToggle={() => toggle("mc")} />
          {!collapsed.mc &&
            visibleMcLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                pathname={pathname}
                onNavigate={onNavigate}
                badge={mcBadges[link.href]}
              />
            ))}
        </div>
      )}

      {/* Platform */}
      <div className={cn(MC_ENABLED ? "mt-6" : "mt-8", "space-y-1")}>
        <SectionHeader label="Platform" collapsed={collapsed.platform} onToggle={() => toggle("platform")} />
        {!collapsed.platform &&
          visiblePlatformLinks.map((link) => (
            <NavLink key={link.href} {...link} pathname={pathname} onNavigate={onNavigate} />
          ))}
      </div>

      <div className="mt-auto space-y-2">
        {/* Gateway status pill — only for users who can see gateway */}
        {MC_ENABLED && can("gateway.configure") && (
          <div className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
            gatewayStatus === "connected"
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5",
          )}>
            <span className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              gatewayStatus === "connected" ? "bg-emerald-400 animate-pulse" : gatewayStatus === "disconnected" ? "bg-red-400" : "bg-foreground-muted animate-pulse",
            )} />
            <span className={cn(
              "mono text-[10px] font-semibold uppercase tracking-wider truncate",
              gatewayStatus === "connected" ? "text-emerald-400" : gatewayStatus === "disconnected" ? "text-red-400" : "text-foreground-muted",
            )}>
              {gatewayStatus === "connected" ? "Gateway online" : gatewayStatus === "connecting" ? "Checking..." : gatewayStatus === "disconnected" ? "Gateway offline" : ""}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-md px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
          <span className="text-sm font-medium text-foreground-soft truncate">{planName}</span>
        </div>
      </div>
    </div>
  );
}
