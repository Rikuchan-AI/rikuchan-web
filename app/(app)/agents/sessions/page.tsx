"use client";

import { useState } from "react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { SessionCard } from "@/components/mc/sessions/SessionCard";

export default function SessionsPage() {
  const sessions = useGatewayStore((s) => s.sessions);
  const agents = useGatewayStore((s) => s.agents);
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
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="rounded-md border border-line bg-surface-strong px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-line bg-surface-strong px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
          <option value="idle">Idle</option>
        </select>
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
