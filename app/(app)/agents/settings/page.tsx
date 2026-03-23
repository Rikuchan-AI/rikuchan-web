"use client";

import { useGatewayStore } from "@/lib/mc/gateway-store";
import { WifiOff } from "lucide-react";
import { HeartbeatModelSelector } from "@/components/mc/settings/HeartbeatModelSelector";
import { LeadBoardAgentSelector } from "@/components/mc/settings/LeadBoardAgentSelector";
import { FreeModelsCatalog } from "@/components/mc/settings/FreeModelsCatalog";
import { AgentGlobalDefaults } from "@/components/mc/settings/AgentGlobalDefaults";
import { SavedGatewaysManager } from "@/components/mc/settings/SavedGatewaysManager";

export default function MCSettingsPage() {
  const gatewayConnected = useGatewayStore((s) => s.status === "connected");

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Mission Control Settings
      </h2>

      <div className="space-y-6">
        <SavedGatewaysManager />

        {gatewayConnected ? (
          <>
            <HeartbeatModelSelector />
            <LeadBoardAgentSelector />
            <FreeModelsCatalog loading={false} />
            <AgentGlobalDefaults />
          </>
        ) : (
          <div className="rounded-xl border border-line bg-surface-muted p-6 text-center space-y-2">
            <WifiOff size={20} className="mx-auto text-foreground-muted" />
            <p className="text-sm font-medium text-foreground-muted">Gateway nao conectado</p>
            <p className="text-xs text-foreground-muted/70">
              Conecte ao gateway na pagina Gateway para configurar modelos, heartbeat e agentes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
