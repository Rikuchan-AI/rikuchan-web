"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { LivePulse } from "@/components/mc/ui/LivePulse";

interface GatewayStatusProps {
  presetName?: string;
  presetUrl?: string;
  presetToken?: string;
}

export function GatewayStatus({ presetName, presetUrl, presetToken }: GatewayStatusProps) {
  const status = useGatewayStore((s) => s.status);
  const latencyMs = useGatewayStore((s) => s.latencyMs);
  const config = useGatewayStore((s) => s.config);
  const hydrated = useGatewayStore((s) => s._configHydrated);
  const connect = useGatewayStore((s) => s.connect);
  const disconnect = useGatewayStore((s) => s.disconnect);
  const updateConfig = useGatewayStore((s) => s.updateConfig);

  const [showToken, setShowToken] = useState(false);
  const [editUrl, setEditUrl] = useState(config.url);
  const [editToken, setEditToken] = useState(config.token);

  useEffect(() => {
    setEditUrl(presetUrl ?? config.url);
  }, [config.url, presetUrl]);

  useEffect(() => {
    setEditToken(presetToken ?? config.token);
  }, [config.token, presetToken]);

  const isConnected = status === "connected";

  const permissionModes: { value: typeof config.permissionMode; label: string }[] = [
    { value: "allow-all",    label: "Allow All" },
    { value: "approve-all",  label: "Approve All" },
    { value: "custom",       label: "Custom" },
  ];

  return (
    <div className="space-y-6">
      {/* Connection header */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <LivePulse color="var(--status-online)" size={10} />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-offline)]" />
            )}
            <span className={`font-semibold tracking-[-0.02em] ${status === "error" ? "text-danger" : status === "connecting" ? "text-warning" : isConnected ? "text-accent" : "text-foreground"}`} style={{ fontFamily: "var(--font-display)" }}>
              {isConnected ? "Connected" : status === "connecting" ? "Connecting..." : status === "error" ? "Connection Failed" : "Disconnected"}
            </span>
            {presetName && (
              <span className="rounded-md px-2 py-0.5 text-[0.65rem] font-semibold border border-accent/15 bg-accent-soft text-accent">
                {presetName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="mono text-xs text-accent">{latencyMs}ms</span>
            )}
            <button
              onClick={() => isConnected ? disconnect() : connect(editUrl, editToken)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isConnected
                  ? "bg-danger-soft text-danger hover:bg-danger/20"
                  : "bg-accent-soft text-accent hover:bg-accent/20"
              }`}
            >
              <RefreshCw size={12} />
              {isConnected ? "Disconnect" : "Connect"}
            </button>
          </div>
        </div>

        {/* URL */}
        <div className="space-y-3">
          <div>
            <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
              Gateway URL
            </label>
            <input
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
              placeholder="ws://127.0.0.1:18789"
            />
          </div>

          {/* Token */}
          <div>
            <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
              Auth Token
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={editToken}
                onChange={(e) => setEditToken(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 pr-10 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="••••••••••••••••"
              />
              <button
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Latency */}
          {isConnected && (
            <div className="flex items-center justify-between py-2 border-t border-line">
              <span className="text-sm text-foreground-soft">Latência</span>
              <span className="mono text-sm font-medium text-accent">{latencyMs}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Permission Mode */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="mono text-xs uppercase text-foreground-muted mb-4" style={{ letterSpacing: "0.18em" }}>
          Permission Mode
        </p>
        <div className="space-y-2">
          {permissionModes.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                config.permissionMode === value
                  ? "border-accent bg-accent"
                  : "border-line-strong group-hover:border-accent/50"
              }`}>
                {config.permissionMode === value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                )}
              </div>
              <input
                type="radio"
                name="permission"
                value={value}
                checked={config.permissionMode === value}
                onChange={() => updateConfig({ permissionMode: value })}
                className="sr-only"
              />
              <span className="text-sm text-foreground-soft group-hover:text-foreground transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Auto-reconnect — only render after hydration to avoid SSR mismatch */}
      {hydrated && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-reconnect</p>
              <p className="text-xs text-foreground-muted mt-0.5">Reconectar automaticamente ao perder conexão</p>
            </div>
            <button
              role="switch"
              aria-checked={config.autoReconnect}
              onClick={() => updateConfig({ autoReconnect: !config.autoReconnect })}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                config.autoReconnect ? "bg-accent" : "bg-surface-strong border border-line-strong"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                config.autoReconnect ? "translate-x-5" : ""
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
