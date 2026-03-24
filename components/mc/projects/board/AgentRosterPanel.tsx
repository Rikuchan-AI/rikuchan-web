"use client";

import { useGatewayStore } from "@/lib/mc/gateway-store";
import type { RosterMember } from "@/lib/mc/types-project";

interface AgentRosterPanelProps {
  roster: RosterMember[];
  tasks: Array<{ id: string; title: string; assignedAgentId: string | null; status: string; subagentSessionKey?: string }>;
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

// ─── Lead Agent Card ─────────────────────────────────────────────────────────

function LeadAgentCard({
  member,
  agentStatus,
  onSelectTask,
  loading,
  activeTasks,
}: {
  member: RosterMember;
  agentStatus?: { status: string; lastActivityAt: number };
  onSelectTask: (taskId: string) => void;
  loading?: boolean;
  activeTasks: Array<{ id: string; title: string }>;
}) {
  const status = agentStatus?.status ?? "offline";
  const isOnline = status === "online" || status === "idle" || status === "thinking";
  const isWorking = status === "online" || status === "thinking";

  const statusDot = loading
    ? "bg-foreground-muted/40 animate-pulse"
    : isWorking
      ? "bg-emerald-400 animate-pulse"
      : status === "idle"
        ? "bg-zinc-400"
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
    <div className="rounded-lg border border-accent/20 bg-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
            {initials}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-[8px] w-[8px] rounded-full border-2 border-surface ${statusDot}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{member.agentName}</p>
          <p className="mono text-[9px] uppercase tracking-wider text-accent">Lead</p>
        </div>
      </div>

      <p className="mono text-[9px] text-foreground-muted/60">
        {loading ? "..." : agentStatus ? (isOnline ? formatTimeSince(agentStatus.lastActivityAt) : status) : "offline"}
      </p>

      {activeTasks.length > 0 && (
        <div className="space-y-1">
          {activeTasks.slice(0, 2).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTask(t.id)}
              className="w-full truncate rounded border border-line bg-surface-muted px-2 py-1 text-left text-[10px] text-foreground-soft hover:border-accent/30 hover:text-foreground transition-colors"
            >
              {t.title}
            </button>
          ))}
          {activeTasks.length > 2 && (
            <p className="text-[9px] text-foreground-muted px-1">+{activeTasks.length - 2} more</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Template Agent Card ─────────────────────────────────────────────────────

function TemplateAgentCard({
  member,
  activeTasks,
  onSelectTask,
}: {
  member: RosterMember;
  activeTasks: Array<{ id: string; title: string; status: string }>;
  onSelectTask: (taskId: string) => void;
}) {
  const isWorking = activeTasks.some((t) => t.status === "progress");
  const hasBlocked = activeTasks.some((t) => t.status === "blocked");

  const statusDot = isWorking
    ? "bg-emerald-400 animate-pulse"
    : hasBlocked
      ? "bg-amber-400"
      : "bg-zinc-600";

  const initials = member.agentName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isWorking ? "border-accent/20 bg-surface" : "border-dashed border-line bg-surface/60"}`}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ${isWorking ? "bg-accent-soft text-accent" : "bg-surface-strong text-foreground-muted"}`}>
            {initials}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-[8px] w-[8px] rounded-full border-2 border-surface ${statusDot}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-xs font-semibold ${isWorking ? "text-foreground" : "text-foreground-soft"}`}>{member.agentName}</p>
          <p className="mono text-[9px] uppercase tracking-wider text-foreground-muted">
            {member.customRoleLabel ?? member.role}
          </p>
        </div>
      </div>

      {activeTasks.length > 0 ? (
        <div className="space-y-1">
          <p className={`mono text-[9px] ${isWorking ? "text-emerald-400" : "text-amber-400"}`}>
            {isWorking ? "working" : "blocked"}
          </p>
          {activeTasks.slice(0, 2).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTask(t.id)}
              className="w-full truncate rounded border border-line bg-surface-muted px-2 py-1 text-left text-[10px] text-foreground-soft hover:border-accent/30 hover:text-foreground transition-colors"
            >
              {t.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="mono text-[9px] text-foreground-muted/40">idle</p>
      )}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

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

  const leadMembers = roster.filter((m) => m.role === "lead");
  const templateMembers = roster.filter((m) => m.role !== "lead");

  return (
    <div className="space-y-2 overflow-y-auto p-2">
      <p className="mono px-1 text-[9px] uppercase tracking-wider text-foreground-muted">
        Agents ({roster.length})
      </p>

      {/* Lead agents */}
      {leadMembers.map((member) => {
        const gwAgent = agentsLoaded
          ? agents.find((a) =>
              a.id === member.agentId ||
              a.id.includes(member.agentId) ||
              member.agentId.includes(a.id)
            )
          : undefined;
        const activeTasks = tasks.filter(
          (t) => t.status === "progress" || t.status === "blocked",
        );

        return (
          <LeadAgentCard
            key={member.agentId}
            member={member}
            agentStatus={
              gwAgent
                ? { status: gwAgent.status, lastActivityAt: gwAgent.lastActivityAt }
                : undefined
            }
            onSelectTask={onSelectTask}
            loading={!agentsLoaded}
            activeTasks={activeTasks}
          />
        );
      })}

      {/* Template agents */}
      {templateMembers.length > 0 && (
        <>
          <p className="mono px-1 pt-1 text-[9px] uppercase tracking-wider text-foreground-muted/60">
            Templates ({templateMembers.length})
          </p>
          {templateMembers.map((member) => {
            const activeTasks = tasks.filter(
              (t) =>
                t.assignedAgentId === member.agentId &&
                (t.status === "progress" || t.status === "blocked"),
            );

            return (
              <TemplateAgentCard
                key={member.agentId}
                member={member}
                activeTasks={activeTasks}
                onSelectTask={onSelectTask}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
