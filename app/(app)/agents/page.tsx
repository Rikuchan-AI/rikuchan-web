"use client";

import { useGatewayStore } from "@/lib/mc/gateway-store";
import { AgentGrid } from "@/components/mc/agents/AgentGrid";
import { GatewayStatus } from "@/components/mc/gateway/GatewayStatus";

export default function AgentsPage() {
  const agents = useGatewayStore((s) => s.agents);
  const status = useGatewayStore((s) => s.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
          Agents
        </h2>
        <GatewayStatus />
      </div>
      <AgentGrid agents={agents} />
    </div>
  );
}
