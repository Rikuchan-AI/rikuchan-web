"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { useNotificationsStore } from "@/lib/mc/notifications-store";
import { initApiClient, getApiClient } from "@/lib/mc/api-client";
import { initSseClient, getSseClient } from "@/lib/mc/sse-client";
import { wireSseToStores } from "@/lib/mc/sse-wiring";
import { CommandPalette } from "@/components/mc/CommandPalette";
import { RefreshCw, WifiOff } from "lucide-react";

const MC_BACKEND_URL = process.env.NEXT_PUBLIC_MC_BACKEND_URL ?? "";

function DisconnectedBanner() {
  const status = useGatewayStore((s) => s.status);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === "connected") return null;

  const isReconnecting = status === "connecting";

  return (
    <div className="fixed bottom-4 right-4 z-30 w-80 rounded-xl border border-warning/30 bg-surface shadow-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <WifiOff size={14} className="text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isReconnecting ? "Connecting..." : "Backend Offline"}
            </p>
            <p className="text-xs text-foreground-muted mt-0.5">
              {isReconnecting
                ? "Connecting to Mission Control backend..."
                : "Some features require backend connection."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-foreground-muted hover:text-foreground text-xs ml-2 shrink-0"
        >
          x
        </button>
      </div>
      {!isReconnecting && (
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors w-full justify-center"
        >
          <RefreshCw size={11} />
          Reload
        </button>
      )}
    </div>
  );
}

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);
  const bootedRef = useRef(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const tokenGetter = () => getToken();

    // Initialize clients
    initApiClient(MC_BACKEND_URL, tokenGetter);
    initSseClient(MC_BACKEND_URL, tokenGetter);

    // Hydrate gateway config from localStorage cache
    useGatewayStore.getState().hydrateConfig();

    async function boot() {
      useGatewayStore.setState({ status: "connecting" });

      try {
        const api = getApiClient();
        const sse = getSseClient();

        // 1. REST hydrate — CRUD endpoints always work, agents needs gateway
        const [projectsResult, groupsResult] = await Promise.allSettled([
          api.projects.list(),
          api.groups.list(),
        ]);

        const projects = projectsResult.status === "fulfilled" ? projectsResult.value : [];
        const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];

        useProjectsStore.setState({ projects, groups, _hydrated: true });

        // Hydrate gateway config from backend settings
        try {
          const settings = await api.settings.get();
          if (settings?.gatewayUrl) {
            const currentConfig = useGatewayStore.getState().config;
            useGatewayStore.setState({
              config: {
                ...currentConfig,
                url: settings.gatewayUrl,
                token: (settings.preferences as Record<string, unknown>)?.gatewayToken as string ?? currentConfig.token,
              },
            });
          }
        } catch { /* non-critical */ }

        // 2. Hydrate tasks per project
        await Promise.all(
          projects.map(async (p) => {
            try {
              const tasks = await api.tasks.list(p.id);
              useProjectsStore.setState((s) => ({
                tasks: { ...s.tasks, [p.id]: tasks },
              }));
            } catch {
              // Skip project if tasks fail
            }
          }),
        );

        // 3. Hydrate notifications
        try {
          const notifications = await api.notifications.list();
          // Notifications store uses a different format — adapt
          if (notifications?.length) {
            useNotificationsStore.setState({
              notifications: notifications.map((n) => ({
                id: n.id,
                type: n.type as "info" | "success" | "warning" | "error",
                title: n.title,
                message: n.body ?? "",
                timestamp: new Date(n.createdAt).getTime(),
                read: n.read,
              })),
              unreadCount: notifications.filter((n) => !n.read).length,
            });
          }
        } catch {
          // Non-critical
        }

        // 4. Wire SSE events to stores
        const unwire = wireSseToStores();

        // 5. Set up reconnect handler
        sse.onReconnect(async () => {
          // Re-hydrate on reconnect — state may have changed while disconnected
          try {
            const freshProjects = await api.projects.list();
            useProjectsStore.setState({ projects: freshProjects });
            // Only fetch agents if there's an active project
            const hasActive = freshProjects.some((p) =>
              ["active", "activating"].includes(String((p as unknown as Record<string, unknown>).status ?? "")),
            );
            if (hasActive) {
              const agents = await api.agents.list();
              useGatewayStore.setState({ agents, registeredAgents: agents });
            }
          } catch { /* best-effort */ }
        });

        // 6. Connect SSE (deltas)
        sse.connect().catch((err) => {
          console.error("[mc] SSE connect failed:", err);
        });

        // Check gateway connection status from backend
        try {
          const gwStatus = await api.gateway.status();
          if (gwStatus.connected) {
            const agents = await api.agents.list();
            useGatewayStore.setState({
              status: "connected",
              connectedAt: Date.now(),
              agents,
              registeredAgents: agents,
              agentsLoaded: true,
              _configHydrated: true,
            });
          } else {
            useGatewayStore.setState({ status: "disconnected", agentsLoaded: true, _configHydrated: true });
          }
        } catch {
          useGatewayStore.setState({ status: "disconnected", agentsLoaded: true, _configHydrated: true });
        }

        cleanupRef.current = () => {
          sse.disconnect();
          unwire();
        };
      } catch (err) {
        console.error("[mc] Boot failed:", err);
        useGatewayStore.setState({
          status: "error",
        });
      }
    }

    boot();

    return () => {
      cleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = useGatewayStore((s) => s.status);
  const connectedAt = useGatewayStore((s) => s.connectedAt);
  const showDisconnectedBanner =
    status !== "connected" && connectedAt !== undefined;

  return (
    <>
      {children}
      {showDisconnectedBanner && <DisconnectedBanner />}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
