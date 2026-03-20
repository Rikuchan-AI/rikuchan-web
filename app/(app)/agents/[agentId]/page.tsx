"use client";

import { useParams } from "next/navigation";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { AgentStatusBadge } from "@/components/mc/agents/AgentStatusBadge";
import { AgentSessionList } from "@/components/mc/agents/AgentSessionList";

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const agents = useGatewayStore((s) => s.agents);
  const sessions = useGatewayStore((s) => s.sessions);

  const agent = agents.find((a) => a.id === agentId);
  const agentSessions = sessions.filter((s) => s.agentId === agentId);

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm">Agent not found: {agentId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2
            className="text-xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {agent.name}
          </h2>
          <AgentStatusBadge status={agent.status} />
        </div>
        <span className="mono text-xs text-foreground-muted">{agent.id}</span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.18em" }}>
            Role
          </p>
          <p className="text-sm font-medium text-foreground">{agent.role}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.18em" }}>
            Model
          </p>
          <p className="text-sm font-medium text-foreground">{agent.model ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.18em" }}>
            Sessions Today
          </p>
          <p className="text-sm font-medium text-foreground metric-number">{agent.sessionCountToday}</p>
        </div>
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-2" style={{ letterSpacing: "0.18em" }}>
            Current Task
          </p>
          <p className="text-sm text-foreground-soft">{agent.currentTask}</p>
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-2" style={{ letterSpacing: "0.18em" }}>
            Capabilities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-md bg-surface-strong border border-line-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      <div>
        <h3
          className="text-base font-semibold tracking-[-0.03em] text-foreground mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent Sessions
        </h3>
        <AgentSessionList sessions={agentSessions} />
      </div>
    </div>
  );
}
