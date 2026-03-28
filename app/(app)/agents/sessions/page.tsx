"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { SessionCard } from "@/components/mc/sessions/SessionCard";
import { Combobox } from "@/components/mc/ui/Combobox";
import { useGatewayGate } from "@/hooks/use-gateway-gate";

export default function SessionsPage() {
  const { connected, GatewayRequiredScreen } = useGatewayGate();
  const sessions = useGatewayStore(useShallow((s) => s.sessions));

  if (!connected) return <GatewayRequiredScreen feature="Sessões" />;
  const agents = useGatewayStore(useShallow((s) => s.agents));
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filtered = sessions.filter((s) => {
    if (filterAgent && s.agentId !== filterAgent) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sessions
        </h2>
        <span className="mono text-xs text-foreground-muted">
          {filtered.length} session{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Combobox
          value={filterAgent}
          onChange={setFilterAgent}
          options={[
            { id: "", label: "All Agents" },
            ...agents.map((a) => ({ id: a.id, label: a.name })),
          ]}
          placeholder="Filter agent"
        />

        <Combobox
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { id: "", label: "All Statuses" },
            { id: "active", label: "Active" },
            { id: "completed", label: "Completed" },
            { id: "error", label: "Error" },
            { id: "idle", label: "Idle" },
          ]}
          placeholder="Filter status"
        />
      </div>

      {/* Session list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-foreground-muted text-sm">No sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
