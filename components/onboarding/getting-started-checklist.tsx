"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Circle, X } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useGatewayStore } from "@/lib/mc/gateway-store";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  autoDetect?: () => boolean;
}

function useAdminItems(): ChecklistItem[] {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const agentCount = useGatewayStore((s) => s.agents.length);

  return useMemo(() => [
    { id: "account", label: "Create account", href: "#", autoDetect: () => true },
    { id: "gateway", label: "Connect gateway", href: "/agents/gateway", autoDetect: () => gatewayStatus === "connected" },
    { id: "project", label: "Create your first project", href: "/agents/projects" },
    { id: "board_lead", label: "Designate a board lead", href: "/agents/projects" },
    { id: "task", label: "Create your first task", href: "/agents/projects" },
    { id: "aha", label: "Watch the board lead in action", href: "/agents/projects", autoDetect: () => agentCount > 0 },
  ], [gatewayStatus, agentCount]);
}

function useOperatorItems(): ChecklistItem[] {
  return useMemo(() => [
    { id: "account", label: "Accept invite", href: "#", autoDetect: () => true },
    { id: "explore", label: "Explore the board", href: "/agents/projects" },
    { id: "task", label: "Create your first task", href: "/agents/projects" },
    { id: "chat", label: "Chat with an agent", href: "/dashboard/chat" },
  ], []);
}

export function GettingStartedChecklist() {
  const { isAdmin } = usePermissions();
  const adminItems = useAdminItems();
  const operatorItems = useOperatorItems();
  const items = isAdmin ? adminItems : operatorItems;

  const [dismissed, setDismissed] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load dismiss state from localStorage
  useEffect(() => {
    try {
      if (localStorage.getItem("rikuchan_getting_started_dismissed") === "true") {
        setDismissed(true);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Auto-detect completed items
  useEffect(() => {
    const detected = new Set<string>();
    for (const item of items) {
      if (item.autoDetect?.()) {
        detected.add(item.id);
      }
    }
    setCompletedIds(detected);
  }, [items]);

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem("rikuchan_getting_started_dismissed", "true"); } catch {}
  }

  if (!loaded || dismissed) return null;

  const completedCount = completedIds.size;
  const totalCount = items.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Getting started</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">First steps with Rikuchan</h2>
        </div>
        <button
          onClick={handleDismiss}
          className="text-foreground-muted hover:text-foreground transition"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => {
          const done = completedIds.has(item.id);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition ${
                done
                  ? "border-line/50 bg-surface-muted text-foreground-muted"
                  : "border-line bg-surface-muted text-foreground-soft hover:border-accent/30 hover:bg-accent/[0.03]"
              }`}
            >
              {done ? (
                <CheckCircle size={16} className="shrink-0 text-accent" />
              ) : (
                <Circle size={16} className="shrink-0 text-foreground-muted" />
              )}
              <span className={done ? "line-through" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-foreground-muted">
          <span>{progressPct}% complete</span>
          <span>{completedCount}/{totalCount}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
