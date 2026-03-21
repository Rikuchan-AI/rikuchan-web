"use client";

import { useGatewayStore } from "@/lib/mc/gateway-store";
import type { RosterMember } from "@/lib/mc/types-project";

interface AgentRosterPanelProps {
  roster: RosterMember[];
  tasks: Array<{ id: string; title: string; assignedAgentId: string | null; status: string }>;
  onSelectTask: (taskId: string) => void;
}

function formatTimeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function AgentCard({
  member,
  agentStatus,
  currentTask,
  assignedCount,
  onSelectTask,
  loading,
}: {
  member: RosterMember;
  agentStatus?: { status: string; lastActivityAt: number };
  currentTask?: { id: string; title: string };
  assignedCount: number;
  onSelectTask: (taskId: string) => void;
  loading?: boolean;
}) {
  const status = agentStatus?.status ?? "offline";
  const isOnline = status === "online" || status === "idle";
  const isWorking = status === "online";

  const statusDot = loading
    ? "bg-foreground-muted/40 animate-pulse"
    : isWorking
      ? "bg-emerald-400 animate-pulse"
      : status === "idle"
        ? "bg-zinc-400"
        : status === "degraded"
          ? "bg-amber-400"
          : status === "error" || status === "offline"
            ? "bg-red-400"
            : isOnline
              ? "bg-emerald-400"
              : "bg-red-400";

  const initials = member.agentName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-lg border border-line bg-surface p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-strong text-[10px] font-semibold text-foreground-soft">
            {initials}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-[8px] w-[8px] rounded-full border-2 border-surface ${statusDot}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{member.agentName}</p>
          <p className="mono text-[9px] uppercase tracking-wider text-foreground-muted">
            {member.customRoleLabel ?? member.role}
          </p>
        </div>
      </div>

      {/* Heartbeat */}
      <p className="mono text-[9px] text-foreground-muted/60">
        {loading ? "…" : agentStatus ? (isOnline ? formatTimeSince(agentStatus.lastActivityAt) : status) : "offline"}
      </p>

      {/* Current task */}
      {currentTask && (
        <button
          onClick={() => onSelectTask(currentTask.id)}
          className="w-full truncate rounded border border-line bg-surface-muted px-2 py-1 text-left text-[10px] text-foreground-soft hover:border-accent/30 hover:text-foreground transition-colors"
        >
          {currentTask.title}
        </button>
      )}

      {/* Capacity bar */}
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-surface-strong overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              assignedCount >= 3 ? "bg-red-400" : assignedCount >= 2 ? "bg-amber-400" : "bg-emerald-400"
            }`}
            style={{ width: `${Math.min((assignedCount / 3) * 100, 100)}%` }}
          />
        </div>
        <span className="mono text-[9px] text-foreground-muted">{assignedCount}/3</span>
      </div>
    </div>
  );
}

export function AgentRosterPanel({ roster, tasks, onSelectTask }: AgentRosterPanelProps) {
  const agents = useGatewayStore((s) => s.agents);
  const agentsLoaded = useGatewayStore((s) => s.agentsLoaded);

  if (roster.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-foreground-muted">No agents in roster</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto p-2">
      <p className="mono px-1 text-[9px] uppercase tracking-wider text-foreground-muted">
        Agents ({roster.length})
      </p>
      {roster.map((member) => {
        const gwAgent = agentsLoaded
          ? agents.find((a) =>
              a.id === member.agentId ||
              a.id.includes(member.agentId) ||
              member.agentId.includes(a.id)
            )
          : undefined;
        const assignedTasks = tasks.filter(
          (t) => t.assignedAgentId === member.agentId && t.status !== "done",
        );
        const workingTask = assignedTasks.find((t) => t.status === "progress");

        return (
          <AgentCard
            key={member.agentId}
            member={member}
            agentStatus={
              gwAgent
                ? { status: gwAgent.status, lastActivityAt: gwAgent.lastActivityAt }
                : undefined
            }
            currentTask={workingTask}
            assignedCount={assignedTasks.length}
            onSelectTask={onSelectTask}
            loading={!agentsLoaded}
          />
        );
      })}
    </div>
  );
}
