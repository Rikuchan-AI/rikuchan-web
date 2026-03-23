"use client";

import { useEffect, useState } from "react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { useChatStore } from "@/lib/mc/chat-store";
import { useNotificationsStore } from "@/lib/mc/notifications-store";
import { useDirectChatStore } from "@/lib/mc/direct-chat-store";
import { CommandPalette } from "@/components/mc/CommandPalette";
import { RefreshCw, WifiOff } from "lucide-react";

function DisconnectedBanner() {
  const connect = useGatewayStore((s) => s.connect);
  const status = useGatewayStore((s) => s.status);
  const reconnectAttempts = useGatewayStore((s) => s.reconnectAttempts);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isReconnecting = status === "connecting";

  return (
    <div className="fixed bottom-4 right-4 z-30 w-80 rounded-xl border border-warning/30 bg-surface shadow-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <WifiOff size={14} className="text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isReconnecting ? "Reconnecting..." : "Gateway Offline"}
            </p>
            <p className="text-xs text-foreground-muted mt-0.5">
              {isReconnecting
                ? "Attempting to reconnect..."
                : "Some features require gateway connection."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-foreground-muted hover:text-foreground text-xs ml-2 shrink-0"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => connect()}
          disabled={isReconnecting}
          className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 flex-1"
        >
          <RefreshCw size={11} className={isReconnecting ? "animate-spin" : ""} />
          {isReconnecting ? "Connecting..." : "Reconnect"}
        </button>
        {reconnectAttempts > 0 && (
          <span className="text-[10px] text-foreground-muted">Attempt {reconnectAttempts}</span>
        )}
      </div>
    </div>
  );
}

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const hydrateConfig = useGatewayStore((s) => s.hydrateConfig);
  const connect = useGatewayStore((s) => s.connect);
  const status = useGatewayStore((s) => s.status);
  const connectedAt = useGatewayStore((s) => s.connectedAt);
  const hydrated = useGatewayStore((s) => s._configHydrated);
  const config = useGatewayStore((s) => s.config);
  const hydrateProjects = useProjectsStore((s) => s.hydrate);
  const hydrateChat = useChatStore((s) => s._hydrateFromStorage);
  const hydrateNotifications = useNotificationsStore((s) => s._hydrate);
  const hydrateDirectChat = useDirectChatStore((s) => s._hydrate);
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

  // Hydrate persisted data on mount
  useEffect(() => {
    hydrateConfig();
    hydrateProjects();
    hydrateChat();
    hydrateNotifications();
    hydrateDirectChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No auto-connect on mount — user connects manually via /agents/gateway

  // Show non-blocking banner when gateway disconnects (not on first load)
  const showDisconnectedBanner = status !== "connected" && connectedAt !== undefined;

  return (
    <>
      {children}
      {showDisconnectedBanner && <DisconnectedBanner />}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
}
