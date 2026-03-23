"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import {
  Crown,
  Code,
  Search,
  FlaskConical,
  FileText,
  Zap,
  Users,
  AlertTriangle,
  Heart,
} from "lucide-react";
import type { RosterMember, RosterRole, RosterHeartbeatConfig } from "@/lib/mc/types-project";
import { HEARTBEAT_FOCUS_OPTIONS, ROLE_DEFAULT_HEARTBEAT } from "@/lib/mc/types-project";

/* ── Role icon mapping ─────────────────────────────────────────────────────── */

const roleIconMap: Record<RosterRole, React.ComponentType<{ size?: number; className?: string }>> = {
  lead:       Crown,
  developer:  Code,
  reviewer:   Search,
  researcher: FlaskConical,
  documenter: FileText,
  custom:     Zap,
};

const roleStyleMap: Record<RosterRole, { className: string }> = {
  lead:       { className: "bg-accent-soft text-accent" },
  developer:  { className: "bg-surface-strong text-foreground-muted" },
  reviewer:   { className: "bg-surface-strong text-foreground-muted" },
  researcher: { className: "bg-surface-strong text-foreground-muted" },
  documenter: { className: "bg-surface-strong text-foreground-muted" },
  custom:     { className: "bg-surface-strong text-foreground-muted" },
};

/* ── Permission labels ─────────────────────────────────────────────────────── */

const permissionKeys = [
  { key: "read" as const,         label: "READ" },
  { key: "write" as const,        label: "WRITE" },
  { key: "exec" as const,         label: "EXEC" },
  { key: "webSearch" as const,    label: "WEB" },
  { key: "sessionsSend" as const, label: "SEND" },
  { key: "sessionsSpawn" as const, label: "SPAWN" },
] as const;

/* ── Component ─────────────────────────────────────────────────────────────── */

interface RosterCardProps {
  member: RosterMember;
  agentStatus?: string;
  currentTask?: string;
  rosterMembers?: RosterMember[];
  onUpdateSpawnConfig?: (agentId: string, targets: string[]) => void;
  onUpdateHeartbeat?: (agentId: string, config: RosterHeartbeatConfig) => void;
  saving?: boolean;
  projectId?: string;
  unreadCount?: number;
}

export function RosterCard({ member, agentStatus, currentTask, rosterMembers, onUpdateSpawnConfig, onUpdateHeartbeat, saving, projectId, unreadCount }: RosterCardProps) {
  const [showSpawnConfig, setShowSpawnConfig] = useState(false);
  const [showHeartbeatConfig, setShowHeartbeatConfig] = useState(false);
  const RoleIcon = roleIconMap[member.role];
  const roleStyle = roleStyleMap[member.role];
  const roleLabel = member.customRoleLabel ?? member.role;
  const isOnline = agentStatus === "online" || agentStatus === "thinking";
  const hbConfig = member.heartbeatConfig ?? ROLE_DEFAULT_HEARTBEAT[member.role];

  const initials = member.agentName
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-lg border border-line bg-surface p-4 glow-card transition-all duration-300">
      {/* Header: avatar + name + online dot */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground text-[0.6rem] font-bold">
          {initials}
          {/* Online/Offline indicator */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface"
            style={{
              backgroundColor: isOnline ? "var(--status-online)" : "var(--status-offline)",
            }}
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {member.agentName}
          </p>
        </div>
      </div>

      {/* Role badge + Chat button */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] ${roleStyle.className}`}
        >
          <RoleIcon size={10} />
          {roleLabel}
        </span>
        {projectId && (
          <Link
            href={`/projects/${projectId}/agents/${member.agentId}/chat`}
            className="relative flex items-center gap-1 rounded-md px-2 py-1 text-[0.6rem] font-medium text-foreground-muted hover:text-accent hover:bg-surface-strong transition-colors"
          >
            <MessageSquare size={10} />
            Chat
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </Link>
        )}
      </div>

      {/* Warning: lead without full spawn access */}
      {member.role === "lead" && rosterMembers && (() => {
        const others = rosterMembers.filter((r) => r.agentId !== member.agentId);
        const hasAllAccess = !member.spawnTargets || others.every((r) => member.spawnTargets!.includes(r.agentId));
        if (hasAllAccess || others.length === 0) return null;
        const missingCount = others.length - (member.spawnTargets?.length ?? 0);
        return (
          <div className="flex items-center gap-2 rounded-md bg-warm-soft border border-warning/20 px-3 py-2 mb-3">
            <AlertTriangle size={12} className="text-warning flex-shrink-0" />
            <p className="text-[0.65rem] text-warning leading-snug">
              Lead agent cannot spawn {missingCount} roster agent{missingCount !== 1 ? "s" : ""}. This may limit coordination.
            </p>
          </div>
        );
      })()}

      {/* Current task preview */}
      {currentTask && (
        <p className="text-xs italic text-foreground-muted leading-snug line-clamp-2 mb-3">
          {currentTask}
        </p>
      )}

      {/* Permission toggles (2x3 grid) */}
      <div className="grid grid-cols-3 gap-1.5">
        {permissionKeys.map(({ key, label }) => {
          const enabled = member.permissions[key];
          return (
            <span
              key={key}
              className={`flex items-center justify-center rounded px-1.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.08em] ${
                enabled
                  ? "bg-accent-soft text-accent"
                  : "bg-surface-strong text-foreground-muted/40"
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Spawn targets — show for all agents when roster has multiple members */}
      {rosterMembers && rosterMembers.length > 1 && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={10} className="text-foreground-muted" />
              <span className="mono text-[0.55rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
                Can spawn
              </span>
            </div>
            <button
              onClick={() => setShowSpawnConfig(!showSpawnConfig)}
              disabled={saving}
              className={`text-[0.6rem] font-medium transition-colors ${
                saving ? "text-foreground-muted cursor-wait" : "text-accent hover:text-accent-deep"
              }`}
            >
              {saving ? "Saving..." : showSpawnConfig ? "Done" : "Configure"}
            </button>
          </div>

          {showSpawnConfig ? (
            <div className="space-y-1">
              {rosterMembers
                .filter((r) => r.agentId !== member.agentId)
                .map((r) => {
                  const isAllowed = member.permissions.sessionsSpawn && (member.spawnTargets?.includes(r.agentId) ?? true);
                  return (
                    <label
                      key={r.agentId}
                      className={`flex items-center gap-2 rounded px-2 py-1 transition-colors ${
                        saving ? "opacity-50 cursor-wait" : "cursor-pointer hover:bg-surface-strong"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${
                        isAllowed ? "border-accent bg-accent" : "border-line-strong"
                      }`}>
                        {isAllowed && <div className="w-1.5 h-1.5 rounded-sm bg-accent-foreground" />}
                      </div>
                      <span className="text-xs text-foreground-soft">{r.agentName}</span>
                      <span className="mono text-[0.5rem] text-foreground-muted uppercase">{r.role}</span>
                      <input
                        type="checkbox"
                        checked={isAllowed}
                        onChange={() => {
                          if (!onUpdateSpawnConfig || saving) return;
                          const current = member.spawnTargets ?? rosterMembers.filter((rm) => rm.agentId !== member.agentId).map((rm) => rm.agentId);
                          const updated = isAllowed
                            ? current.filter((id) => id !== r.agentId)
                            : [...current, r.agentId];
                          onUpdateSpawnConfig(member.agentId, updated);
                        }}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(() => {
                if (!member.permissions.sessionsSpawn) {
                  return <span className="text-[0.6rem] text-foreground-muted">None — spawn disabled</span>;
                }
                const others = rosterMembers.filter((r) => r.agentId !== member.agentId);
                const targets = member.spawnTargets
                  ? others.filter((r) => member.spawnTargets!.includes(r.agentId))
                  : others;
                return targets.length === others.length ? (
                  <span className="text-[0.6rem] text-foreground-muted">All roster agents</span>
                ) : targets.length === 0 ? (
                  <span className="text-[0.6rem] text-foreground-muted">None</span>
                ) : (
                  targets.map((r) => (
                    <span key={r.agentId} className="rounded bg-surface-strong px-1.5 py-0.5 text-[0.55rem] text-foreground-muted">
                      {r.agentName}
                    </span>
                  ))
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Heartbeat config */}
      <div className="mt-3 pt-3 border-t border-line">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Heart size={10} className={hbConfig.enabled ? "text-accent" : "text-foreground-muted"} />
            <span className="mono text-[0.55rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
              Heartbeat
            </span>
            {hbConfig.enabled && (
              <span className="text-[0.55rem] text-accent">{hbConfig.intervalSeconds}s</span>
            )}
          </div>
          <button
            onClick={() => setShowHeartbeatConfig(!showHeartbeatConfig)}
            className="text-[0.6rem] text-accent hover:text-accent-deep font-medium transition-colors"
          >
            {showHeartbeatConfig ? "Done" : "Configure"}
          </button>
        </div>

        {showHeartbeatConfig ? (
          <div className="space-y-2.5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground-soft">Enabled</span>
              <button
                role="switch"
                aria-checked={hbConfig.enabled}
                onClick={() => {
                  const updated = { ...hbConfig, enabled: !hbConfig.enabled };
                  onUpdateHeartbeat?.(member.agentId, updated);
                }}
                className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
                  hbConfig.enabled ? "bg-accent" : "bg-surface-strong border border-line-strong"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
                  hbConfig.enabled ? "translate-x-4" : ""
                }`} />
              </button>
            </div>

            {/* Interval */}
            <div>
              <span className="text-[0.6rem] text-foreground-muted uppercase">Interval</span>
              <Combobox
                value={String(hbConfig.intervalSeconds)}
                onChange={(v) => {
                  const updated = { ...hbConfig, intervalSeconds: Number(v) };
                  onUpdateHeartbeat?.(member.agentId, updated);
                }}
                options={[
                  { id: "30", label: "30s" },
                  { id: "60", label: "1 min" },
                  { id: "120", label: "2 min" },
                  { id: "300", label: "5 min" },
                  { id: "600", label: "10 min" },
                  { id: "900", label: "15 min" },
                ]}
              />
            </div>

            {/* Focus areas */}
            <div>
              <span className="text-[0.6rem] text-foreground-muted uppercase">Focus Areas</span>
              <div className="space-y-1 mt-1">
                {HEARTBEAT_FOCUS_OPTIONS
                  .filter((opt) => opt.roles.includes(member.role))
                  .map((opt) => {
                    const isActive = hbConfig.focus.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:bg-surface-strong transition-colors"
                      >
                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                          isActive ? "border-accent bg-accent" : "border-line-strong"
                        }`}>
                          {isActive && <div className="w-1.5 h-1.5 rounded-sm bg-accent-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs text-foreground-soft">{opt.label}</span>
                          <p className="text-[0.55rem] text-foreground-muted leading-tight">{opt.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => {
                            const focus = isActive
                              ? hbConfig.focus.filter((f) => f !== opt.value)
                              : [...hbConfig.focus, opt.value];
                            onUpdateHeartbeat?.(member.agentId, { ...hbConfig, focus });
                          }}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Custom prompt (if "custom" focus is selected) */}
            {hbConfig.focus.includes("custom") && (
              <div>
                <span className="text-[0.6rem] text-foreground-muted uppercase">Custom Prompt</span>
                <textarea
                  value={hbConfig.customPrompt ?? ""}
                  onChange={(e) => {
                    onUpdateHeartbeat?.(member.agentId, { ...hbConfig, customPrompt: e.target.value });
                  }}
                  className="w-full mt-1 rounded-md border border-line bg-surface-strong px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent/50 min-h-[60px]"
                  placeholder="Custom heartbeat instructions..."
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {!hbConfig.enabled ? (
              <span className="text-[0.6rem] text-foreground-muted">Disabled</span>
            ) : hbConfig.focus.length === 0 ? (
              <span className="text-[0.6rem] text-foreground-muted">No focus areas</span>
            ) : (
              hbConfig.focus.map((f) => (
                <span key={f} className="rounded bg-surface-strong px-1.5 py-0.5 text-[0.55rem] text-foreground-muted">
                  {HEARTBEAT_FOCUS_OPTIONS.find((o) => o.value === f)?.label ?? f}
                </span>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
