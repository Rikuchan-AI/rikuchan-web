"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { AgentGrid } from "@/components/mc/agents/AgentGrid";
import { GatewayStatus } from "@/components/mc/gateway/GatewayStatus";
import { LivePulse } from "@/components/mc/ui/LivePulse";
import { useGatewayGate } from "@/hooks/use-gateway-gate";

export default function AgentsPage() {
  const agents = useGatewayStore(useShallow((s) => s.agents));
  const agentsLoaded = useGatewayStore((s) => s.agentsLoaded);
  const status = useGatewayStore((s) => s.status);
  const latencyMs = useGatewayStore((s) => s.latencyMs);
  const configUrl = useGatewayStore((s) => s.config.url);
  const { connected, loading, GatewayRequiredScreen, GatewayLoadingScreen } = useGatewayGate();

  const isConnected = status === "connected";
  const [gatewayExpanded, setGatewayExpanded] = useState(!isConnected);

  // Collapse when connected, expand when disconnected
  useEffect(() => {
    setGatewayExpanded(!isConnected);
  }, [isConnected]);

  if (loading) return <GatewayLoadingScreen />;
  if (!connected) return <GatewayRequiredScreen feature="Agentes" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
          Agents
        </h2>
        <Link
          href="/agents/new"
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <Plus size={14} />
          New Agent
        </Link>
      </div>

      {/* Collapsible gateway panel */}
      {!gatewayExpanded && isConnected ? (
        <button
          type="button"
          onClick={() => setGatewayExpanded(true)}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface px-4 transition-colors hover:bg-surface-strong"
          style={{ height: 40 }}
        >
          <LivePulse color="var(--status-online)" size={8} />
          <span className="text-sm font-medium text-accent">Connected</span>
          <span className="mx-1 text-foreground-muted">|</span>
          <span className="mono truncate text-xs text-foreground-muted" style={{ maxWidth: 220 }}>
            {configUrl}
          </span>
          <span className="mx-1 text-foreground-muted">|</span>
          <span className="mono text-xs text-accent">{latencyMs}ms</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-foreground-muted">
            Details <ChevronDown size={12} />
          </span>
        </button>
      ) : (
        <div>
          {isConnected && (
            <button
              type="button"
              onClick={() => setGatewayExpanded(false)}
              className="mb-2 flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <ChevronUp size={12} />
              Collapse
            </button>
          )}
          <GatewayStatus />
        </div>
      )}

      <AgentGrid agents={agents} loading={isConnected && !agentsLoaded} />
    </div>
  );
}
