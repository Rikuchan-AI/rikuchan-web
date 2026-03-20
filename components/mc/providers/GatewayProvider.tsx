"use client";

import { useEffect, useState, useCallback } from "react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { useChatStore } from "@/lib/mc/chat-store";
import { useNotificationsStore } from "@/lib/mc/notifications-store";
import { useDirectChatStore } from "@/lib/mc/direct-chat-store";
import { CommandPalette } from "@/components/mc/CommandPalette";
import { Mascot } from "@/components/shared/mascot";
import { RefreshCw, WifiOff } from "lucide-react";

function DisconnectedOverlay() {
  const connect = useGatewayStore((s) => s.connect);
  const config = useGatewayStore((s) => s.config);
  const status = useGatewayStore((s) => s.status);
  const reconnectAt = useGatewayStore((s) => s.reconnectAt);
  const reconnectAttempts = useGatewayStore((s) => s.reconnectAttempts);
  const expectedRestartReason = useGatewayStore((s) => s.expectedRestartReason);

  const [countdown, setCountdown] = useState<number | null>(null);

  const handleReconnect = useCallback(() => {
    connect();
  }, [connect]);

  const shouldAutoReconnect = config.autoReconnect || Boolean(expectedRestartReason);

  useEffect(() => {
    if (status !== "disconnected" || !shouldAutoReconnect || !reconnectAt) {
      setCountdown(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((reconnectAt - Date.now()) / 1000));
      setCountdown(remaining);
    }, 250);
    setCountdown(Math.max(0, Math.ceil((reconnectAt - Date.now()) / 1000)));
    return () => clearInterval(interval);
  }, [reconnectAt, shouldAutoReconnect, status]);

  const isReconnecting = status === "connecting";
  const isExpectedRestart = expectedRestartReason === "heartbeat-model-update";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60" style={{ backdropFilter: "blur(4px)" }}>
      <div className="mx-4 w-full max-w-sm space-y-5 rounded-xl border border-danger/30 bg-surface p-8 text-center">
        <div className="flex justify-center">
          <div className={`relative ${isReconnecting ? "animate-pulse" : ""}`}>
            <Mascot size="lg" />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-danger bg-surface">
              <WifiOff size={10} className="text-danger" />
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {isExpectedRestart
              ? isReconnecting ? "Restarting OpenClaw..." : "Applying Heartbeat Model..."
              : isReconnecting ? "Reconnecting..." : "Connection Lost"}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {isExpectedRestart
              ? isReconnecting
                ? "Waiting for OpenClaw to come back after applying the new heartbeat model."
                : "The gateway is restarting to apply the new heartbeat model."
              : isReconnecting
                ? "Attempting to reconnect to the gateway..."
                : "The connection to the OpenClaw gateway was lost."}
          </p>
        </div>
        <div className="space-y-1.5 rounded-md border border-line bg-surface-muted p-3">
          <div className="flex items-center justify-between">
            <span className="mono text-xs text-foreground-muted">Gateway</span>
            <span className="mono ml-2 max-w-[180px] truncate text-xs text-foreground-soft">{config.url}</span>
          </div>
          {reconnectAttempts > 0 && (
            <div className="flex items-center justify-between">
              <span className="mono text-xs text-foreground-muted">Retries</span>
              <span className="mono text-xs text-foreground-soft">{reconnectAttempts}</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            <RefreshCw size={14} className={isReconnecting ? "animate-spin" : ""} />
            {isExpectedRestart
              ? isReconnecting ? "Waiting for restart..." : "Retry Now"
              : isReconnecting ? "Connecting..." : "Reconnect Now"}
          </button>
          {countdown !== null && !isReconnecting && (
            <p className="text-xs text-foreground-muted">
              Retrying in <span className="font-medium text-foreground">{countdown}s</span>
            </p>
          )}
        </div>
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

  // Auto-connect if saved credentials exist
  useEffect(() => {
    if (hydrated && status === "disconnected" && config.token && config.url) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const showDisconnectedOverlay = (status === "disconnected" || status === "connecting") && connectedAt !== undefined;

  return (
    <>
      {children}
      {showDisconnectedOverlay && <DisconnectedOverlay />}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
}
