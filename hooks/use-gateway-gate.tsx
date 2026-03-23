"use client";

import Link from "next/link";
import { Wifi, WifiOff } from "lucide-react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { RikuLoader } from "@/components/shared/riku-loader";

/**
 * Hook for features that depend on gateway connection.
 *
 * - `connected`: true when gateway WebSocket is open
 * - `GatewayOfflineBanner`: small inline banner to embed in pages with mixed content
 * - `GatewayRequiredScreen`: full-page empty state for pages that are 100% gateway-dependent
 */
export function useGatewayGate() {
  const status = useGatewayStore((s) => s.status);
  const connected = status === "connected";

  return { connected, GatewayOfflineBanner, GatewayRequiredScreen };
}

/** Inline banner for pages that partially work without gateway */
function GatewayOfflineBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5">
      <WifiOff size={14} className="text-warning shrink-0" />
      <p className="flex-1 text-xs text-foreground-muted">
        {message ?? "Algumas funcionalidades requerem conexão com o gateway."}
      </p>
      <Link
        href="/agents/gateway"
        className="shrink-0 flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-foreground-muted hover:text-foreground hover:border-accent/30 transition-colors"
      >
        <Wifi size={10} />
        Conectar
      </Link>
    </div>
  );
}

/** Full-page empty state for pages that are 100% gateway-dependent */
function GatewayRequiredScreen({ feature }: { feature?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <RikuLoader size="md" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Gateway offline</h2>
          <p className="text-sm text-foreground-muted">
            {feature
              ? `${feature} requer conexão com o gateway.`
              : "Conecte ao gateway para acessar esta funcionalidade."}
          </p>
        </div>
        <Link
          href="/agents/gateway"
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <Wifi size={16} />
          Ir para Gateway
        </Link>
      </div>
    </div>
  );
}
