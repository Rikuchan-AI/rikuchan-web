"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, AlertTriangle, Check, Trash2,
  Shield, Bell, Wrench, Cpu, Activity, Settings, Zap, DollarSign,
} from "lucide-react";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import {
  getAgentSpawnConfigFromGateway,
  setAgentSpawnConfigViaGateway,
} from "@/lib/mc/agent-files";
import { ProjectStatusBadge } from "@/components/mc/projects/ProjectStatusBadge";
import { AgentStatusBadge } from "@/components/mc/agents/AgentStatusBadge";
import { MODEL_GROUPS } from "@/lib/mc/models";
import type {
  ProjectStatus,
  OperationMode,
  ProjectModelConfig,
  ProjectHeartbeatConfig,
  ProjectNotificationConfig,
  SpawnPermission,
  TokenBudgetConfig,
} from "@/lib/mc/types-project";

// ─── Accordion section ───────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-strong transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={15} className="text-foreground-muted" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronDown size={15} className="text-foreground-muted" /> : <ChevronRight size={15} className="text-foreground-muted" />}
      </button>
      {open && (
        <div className="border-t border-line p-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
      {children}
    </label>
  );
}

function SaveButton({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        disabled={saving}
        className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

// ─── Section: General ────────────────────────────────────────────────────────

function SectionGeneral({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const groups = useProjectsStore((s) => s.groups);
  const updateProject = useProjectsStore((s) => s.updateProject);

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [groupId, setGroupId] = useState(project?.groupId ?? "");
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { name, description, status, groupId: groupId || undefined });
    setSaving(false);
  };

  return (
    <>
      <div>
        <FieldLabel>Name</FieldLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors min-h-[80px] resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Status</FieldLabel>
          <div className="flex items-center gap-3">
            <ProjectStatusBadge status={status} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div>
          <FieldLabel>Group</FieldLabel>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
          >
            <option value="">Ungrouped</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.icon ? `${g.icon} ` : ""}{g.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>Workspace Path</FieldLabel>
        <p className="text-sm font-mono text-foreground-soft">{project.workspacePath || "—"}</p>
      </div>
      <SaveButton saving={saving} onClick={handleSave} />
    </>
  );
}

// ─── Section: Operation ──────────────────────────────────────────────────────

function SectionOperation({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);

  const [mode, setMode] = useState<OperationMode>(project?.operationMode ?? "supervised");
  const [autoDelegation, setAutoDelegation] = useState(project?.autoDelegation ?? false);
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { operationMode: mode, autoDelegation });
    setSaving(false);
  };

  const MODES: { value: OperationMode; label: string; description: string }[] = [
    { value: "manual",     label: "Manual",     description: "All task assignments require human action." },
    { value: "supervised", label: "Supervised", description: "Lead delegates, but humans approve critical actions." },
    { value: "autonomous", label: "Autonomous", description: "Lead operates independently without approvals." },
  ];

  return (
    <>
      <div>
        <FieldLabel>Operation Mode</FieldLabel>
        <div className="rounded-lg border border-line overflow-hidden divide-y divide-line">
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                mode === m.value ? "bg-accent-soft" : "hover:bg-surface-strong"
              }`}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  mode === m.value ? "border-accent bg-accent" : "border-line-strong"
                }`}
              >
                {mode === m.value && <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />}
              </div>
              <input type="radio" name="op-mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
              <div>
                <p className={`text-sm font-medium ${mode === m.value ? "text-accent" : "text-foreground"}`}>{m.label}</p>
                <p className="text-xs text-foreground-muted mt-0.5">{m.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`w-9 h-5 rounded-full transition-colors ${autoDelegation ? "bg-accent" : "bg-surface-strong border border-line-strong"}`}
          onClick={() => setAutoDelegation((v) => !v)}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-all mt-0.5 ${autoDelegation ? "ml-4.5" : "ml-0.5"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Auto-delegation</p>
          <p className="text-xs text-foreground-muted">Lead automatically pulls tasks from backlog based on agent capacity</p>
        </div>
      </label>
      {mode === "autonomous" && (
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warm-soft px-4 py-3">
          <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning">Autonomous mode: ensure spawn permissions are properly configured.</p>
        </div>
      )}
      <SaveButton saving={saving} onClick={handleSave} />
    </>
  );
}

// ─── Section: Model & Provider ───────────────────────────────────────────────

function SectionModel({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const gatewayModels = useGatewayStore((s) => s.availableModels);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const modelGroups = gatewayModels.length > 0 ? gatewayModels : MODEL_GROUPS;
  const allModels = modelGroups.flatMap((g) => g.models);

  const [config, setConfig] = useState<ProjectModelConfig>(
    project?.modelConfig ?? { preferred: "", forced: false },
  );
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { modelConfig: config.preferred ? config : undefined });
    setSaving(false);
  };

  return (
    <>
      <div>
        <FieldLabel>Default Model</FieldLabel>
        <select
          value={config.preferred}
          onChange={(e) => setConfig({ ...config, preferred: e.target.value })}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
        >
          <option value="">Gateway routing (auto)</option>
          {modelGroups.map((group) => (
            <optgroup key={group.provider} label={group.provider}>
              {group.models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}{m.recommended ? " ★" : ""}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.forced}
          onChange={(e) => setConfig({ ...config, forced: e.target.checked })}
          className="rounded border-line mt-0.5"
        />
        <div>
          <p className="text-sm font-medium text-foreground">Force model for all agents</p>
          <p className="text-xs text-foreground-muted">Overrides individual agent model preferences</p>
          {config.forced && (
            <span className="inline-block mt-1 rounded-md bg-warning/10 border border-warning/20 px-1.5 py-0.5 text-[10px] text-warning">
              FORCED — agent-level configs are ignored
            </span>
          )}
        </div>
      </label>

      {config.preferred && (
        <div>
          <FieldLabel>Fallback Model</FieldLabel>
          <select
            value={config.fallback ?? ""}
            onChange={(e) => setConfig({ ...config, fallback: e.target.value || undefined })}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
          >
            <option value="">None</option>
            {allModels.filter((m) => m.id !== config.preferred).map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      <SaveButton saving={saving} onClick={handleSave} />
    </>
  );
}

// ─── Section: Heartbeat & Health ─────────────────────────────────────────────

function SectionHeartbeat({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const gwAgents = useGatewayStore((s) => s.agents);

  const defaultConfig: ProjectHeartbeatConfig = {
    intervalSeconds: 30,
    degradedThreshold: 60,
    offlineThreshold: 300,
    autoReassign: false,
  };

  const [config, setConfig] = useState<ProjectHeartbeatConfig>(
    project?.heartbeatConfig ?? defaultConfig,
  );
  const [saving, setSaving] = useState(false);
  const [syncingAgent, setSyncingAgent] = useState<string | null>(null);

  if (!project) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { heartbeatConfig: config });
    setSaving(false);
  };

  const handleSyncHeartbeat = async (agentId: string, intervalSeconds: number) => {
    setSyncingAgent(agentId);
    const { patchAgentDefaults } = await import("@/lib/mc/agent-files");
    const intervalStr = intervalSeconds >= 60
      ? `${Math.round(intervalSeconds / 60)}m`
      : `${intervalSeconds}s`;
    await patchAgentDefaults({
      agentId,
      perAgent: {
        heartbeat: {
          every: intervalStr,
          model: "rikuchan-heartbeat/glm-4.7-flash",
        },
      },
      globalDefaults: {},
    });
    setSyncingAgent(null);
  };

  const handleUpdateAgentHeartbeat = async (agentId: string, intervalSeconds: number, enabled: boolean) => {
    const newRoster = project.roster.map((m) => {
      if (m.agentId !== agentId) return m;
      return {
        ...m,
        heartbeatConfig: {
          ...m.heartbeatConfig!,
          intervalSeconds,
          enabled,
        },
      };
    });
    await updateProject(projectId, { roster: newRoster });

    // Also sync to openclaw
    if (enabled) {
      await handleSyncHeartbeat(agentId, intervalSeconds);
    }
  };

  return (
    <>
      {/* Project-level thresholds */}
      <p className="mono text-[10px] uppercase text-foreground-muted tracking-wider">Project Thresholds</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "intervalSeconds" as const, label: "Interval (s)", min: 10, max: 300 },
          { key: "degradedThreshold" as const, label: "Degraded after (s)", min: 10, max: 600 },
          { key: "offlineThreshold" as const, label: "Offline after (s)", min: 60, max: 3600 },
        ].map(({ key, label, min, max }) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <input
              type="number"
              min={min}
              max={max}
              value={config[key]}
              onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.autoReassign}
          onChange={(e) => setConfig({ ...config, autoReassign: e.target.checked })}
          className="rounded border-line mt-0.5"
        />
        <div>
          <p className="text-sm font-medium text-foreground">Auto-reassign on offline</p>
          <p className="text-xs text-foreground-muted">When an agent goes offline during a task, reassign to the next available agent</p>
        </div>
      </label>

      <SaveButton saving={saving} onClick={handleSave} />

      {/* Per-agent heartbeat config */}
      <div className="border-t border-line pt-4 mt-2">
        <p className="mono text-[10px] uppercase text-foreground-muted tracking-wider mb-3">Agent Heartbeat (OpenClaw)</p>
        <p className="text-xs text-foreground-muted mb-3">
          Configure heartbeat interval per agent in OpenClaw. Changes are applied immediately to the gateway.
        </p>
        <div className="space-y-2">
          {project.roster.map((member) => {
            const gwAgent = gwAgents.find((a) => a.id === member.agentId);
            const hbCfg = member.heartbeatConfig;
            const isOnline = gwAgent && ["online", "idle", "thinking"].includes(gwAgent.status);
            return (
              <div key={member.agentId} className="flex items-center justify-between rounded-md border border-line bg-surface-strong px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-success" : "bg-danger"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.agentName}</p>
                    <p className="text-[10px] text-foreground-muted">{member.role} · {hbCfg?.enabled ? `${hbCfg.intervalSeconds}s` : "disabled"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={hbCfg?.intervalSeconds ?? 300}
                    onChange={(e) => handleUpdateAgentHeartbeat(member.agentId, Number(e.target.value), true)}
                    className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent/50"
                  >
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={120}>2m</option>
                    <option value={300}>5m</option>
                    <option value={600}>10m</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSyncHeartbeat(member.agentId, hbCfg?.intervalSeconds ?? 300)}
                    disabled={syncingAgent === member.agentId}
                    className="h-7 px-2.5 rounded-md border border-line bg-surface text-[10px] text-foreground-muted hover:text-foreground hover:border-accent/40 transition-colors disabled:opacity-50"
                  >
                    {syncingAgent === member.agentId ? "Syncing..." : "Sync to OpenClaw"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Section: Spawn Permissions ──────────────────────────────────────────────

function SectionSpawn({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const agents = useGatewayStore((s) => s.agents);

  const [permissions, setPermissions] = useState<SpawnPermission[]>(
    project?.spawnPermissions ?? [],
  );
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const roster = project.roster;
  const lead = roster.find((m) => m.role === "lead");

  // Check if lead can spawn all non-lead members
  const nonLeadMembers = roster.filter((m) => m.role !== "lead");
  const leadSpawnTargets = permissions
    .filter((p) => lead && p.sourceAgentId === lead.agentId)
    .map((p) => p.targetAgentId);
  const missingSpawnTargets = nonLeadMembers.filter(
    (m) => !leadSpawnTargets.includes(m.agentId),
  );
  const hasIncompletePerms = missingSpawnTargets.length > 0 && nonLeadMembers.length > 0;

  const getPermission = (sourceId: string, targetId: string) =>
    permissions.find((p) => p.sourceAgentId === sourceId && p.targetAgentId === targetId);

  const toggleSpawn = (sourceId: string, targetId: string) => {
    const exists = getPermission(sourceId, targetId);
    if (exists) {
      setPermissions(
        permissions.filter(
          (p) => !(p.sourceAgentId === sourceId && p.targetAgentId === targetId),
        ),
      );
    } else {
      setPermissions([
        ...permissions,
        { sourceAgentId: sourceId, targetAgentId: targetId, maxConcurrent: 1, requireApproval: false },
      ]);
    }
  };

  const updatePerm = (
    sourceId: string,
    targetId: string,
    updates: Partial<SpawnPermission>,
  ) => {
    setPermissions(
      permissions.map((p) =>
        p.sourceAgentId === sourceId && p.targetAgentId === targetId
          ? { ...p, ...updates }
          : p,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { spawnPermissions: permissions });
    // Sync to gateway
    for (const sourceId of roster.map((m) => m.agentId)) {
      const targets = permissions
        .filter((p) => p.sourceAgentId === sourceId)
        .map((p) => p.targetAgentId);
      if (targets.length > 0) {
        await setAgentSpawnConfigViaGateway(sourceId, targets);
      }
    }
    setSaving(false);
  };

  return (
    <>
      {/* Lead warning */}
      {hasIncompletePerms && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warm-soft px-4 py-3">
          <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-warning">Board Lead permissions incomplete</p>
            <p className="text-xs text-warning/80 mt-0.5">
              Lead cannot spawn: {missingSpawnTargets.map((m) => m.agentName).join(", ")}. In Autonomous mode, delegation will fail.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!lead) return;
                const newPerms = [...permissions];
                for (const target of missingSpawnTargets) {
                  newPerms.push({
                    sourceAgentId: lead.agentId,
                    targetAgentId: target.agentId,
                    maxConcurrent: 1,
                    requireApproval: false,
                  });
                }
                setPermissions(newPerms);
              }}
              className="mt-2 text-xs text-accent hover:text-accent-deep font-medium"
            >
              Fix permissions →
            </button>
          </div>
        </div>
      )}

      {/* Spawn matrix per roster member */}
      {roster.length < 2 ? (
        <p className="text-sm text-foreground-muted">
          Add more agents to the roster to configure spawn permissions.
        </p>
      ) : (
        <div className="space-y-4">
          {roster.map((source) => {
            const targets = roster.filter((m) => m.agentId !== source.agentId);
            const sourceAgent = agents.find((a) => a.id === source.agentId);

            return (
              <div key={source.agentId} className="rounded-lg border border-line overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-strong border-b border-line">
                  <span className="text-xs font-semibold text-foreground">{source.agentName}</span>
                  {source.role === "lead" && (
                    <span className="rounded-md bg-accent-soft border border-accent/15 px-1.5 py-0.5 text-[10px] text-accent">Lead</span>
                  )}
                  {sourceAgent && <AgentStatusBadge status={sourceAgent.status} />}
                  <span className="text-xs text-foreground-muted ml-auto">Can spawn:</span>
                </div>
                <div className="divide-y divide-line">
                  {targets.map((target) => {
                    const perm = getPermission(source.agentId, target.agentId);
                    const enabled = !!perm;
                    return (
                      <div key={target.agentId} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                enabled ? "border-accent bg-accent" : "border-line-strong"
                              }`}
                              onClick={() => toggleSpawn(source.agentId, target.agentId)}
                            >
                              {enabled && <Check size={10} className="text-accent-foreground" />}
                            </div>
                            <span className="text-xs text-foreground">{target.agentName}</span>
                            <span className="text-[10px] text-foreground-muted">({target.role})</span>
                          </label>

                          {enabled && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-foreground-muted">Max:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={perm?.maxConcurrent ?? 1}
                                  onChange={(e) =>
                                    updatePerm(source.agentId, target.agentId, {
                                      maxConcurrent: Number(e.target.value),
                                    })
                                  }
                                  className="w-14 rounded border border-line bg-surface-strong px-2 py-0.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
                                />
                              </div>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm?.requireApproval ?? false}
                                  onChange={(e) =>
                                    updatePerm(source.agentId, target.agentId, {
                                      requireApproval: e.target.checked,
                                    })
                                  }
                                  className="rounded border-line"
                                />
                                <span className="text-[10px] text-foreground-muted">Needs approval</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SaveButton saving={saving} onClick={handleSave} />
    </>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────────

function SectionNotifications({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);

  const defaultConfig: ProjectNotificationConfig = {
    taskBlocked: true,
    agentOffline: true,
    sprintComplete: true,
    approvalPending: true,
    channels: ["dashboard"],
  };

  const [config, setConfig] = useState<ProjectNotificationConfig>(
    project?.notificationConfig ?? defaultConfig,
  );
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { notificationConfig: config });
    setSaving(false);
  };

  const toggleChannel = (ch: "telegram" | "dashboard") => {
    setConfig((c) => ({
      ...c,
      channels: c.channels.includes(ch)
        ? c.channels.filter((x) => x !== ch)
        : [...c.channels, ch],
    }));
  };

  const EVENTS: { key: keyof Omit<ProjectNotificationConfig, "channels">; label: string; required?: boolean }[] = [
    { key: "taskBlocked",    label: "Task blocked" },
    { key: "agentOffline",   label: "Agent offline" },
    { key: "sprintComplete", label: "Sprint complete" },
    { key: "approvalPending", label: "Approval pending" },
  ];

  return (
    <>
      <div>
        <FieldLabel>Events</FieldLabel>
        <div className="space-y-2">
          {EVENTS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                className="rounded border-line"
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Channels</FieldLabel>
        <div className="flex gap-3">
          {(["dashboard", "telegram"] as const).map((ch) => (
            <label key={ch} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.channels.includes(ch)}
                onChange={() => toggleChannel(ch)}
                className="rounded border-line"
                disabled={ch === "dashboard"}
              />
              <span className="text-sm text-foreground capitalize">{ch}</span>
              {ch === "dashboard" && (
                <span className="text-[10px] text-foreground-muted">(always on)</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <SaveButton saving={saving} onClick={handleSave} />
    </>
  );
}

// ─── Section: Budget ─────────────────────────────────────────────────────────

function SectionBudget({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);

  const defaultBudget: TokenBudgetConfig = {
    monthlyLimit: 0,
    alertAt80: true,
    alertAt90: true,
    autoPauseAt100: false,
  };

  const [config, setConfig] = useState<TokenBudgetConfig>(
    project?.tokenBudget ?? defaultBudget,
  );
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const spend = config.currentMonthSpend ?? 0;
  const limit = config.monthlyLimit;
  const pct = limit > 0 ? Math.min((spend / limit) * 100, 100) : 0;
  const barColor = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success";

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { tokenBudget: config });
    setSaving(false);
  };

  return (
    <>
      {limit > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-foreground-muted">Current month</span>
            <span className="mono text-xs text-foreground">
              ${spend.toFixed(2)} / ${limit.toFixed(2)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-strong overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          {pct >= 80 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle size={11} />
              {pct >= 100 ? "Budget exceeded" : `${pct.toFixed(0)}% of budget used`}
            </div>
          )}
        </div>
      )}

      <div>
        <FieldLabel>Monthly Limit (USD)</FieldLabel>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">$</span>
          <input
            type="number"
            min={0}
            step={1}
            value={config.monthlyLimit}
            onChange={(e) => setConfig({ ...config, monthlyLimit: Number(e.target.value) })}
            placeholder="0 = no limit"
            className="w-40 rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
          />
          {config.monthlyLimit === 0 && (
            <span className="text-xs text-foreground-muted">No limit</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Alerts</FieldLabel>
        {[
          { key: "alertAt80" as const, label: "Alert at 80% budget used" },
          { key: "alertAt90" as const, label: "Alert at 90% budget used" },
          { key: "autoPauseAt100" as const, label: "Auto-pause project at 100% (block new sessions)" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config[key]}
              onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
              className="rounded border-line"
              disabled={config.monthlyLimit === 0}
            />
            <span className={`text-sm ${config.monthlyLimit === 0 ? "text-foreground-muted/50" : "text-foreground"}`}>
              {label}
            </span>
          </label>
        ))}
      </div>

      <SaveButton saving={saving} onClick={handleSave} />
    </>
  );
}

// ─── Section: Advanced ────────────────────────────────────────────────────────

function SectionAdvanced({ projectId }: { projectId: string }) {
  const project = useProjectsStore(selectProjectById(projectId));
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!project) return null;

  const handleExport = () => {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (confirmText !== project.name) return;
    await deleteProject(projectId);
    router.push("/agents/projects");
  };

  return (
    <>
      <div>
        <FieldLabel>Workspace Path</FieldLabel>
        <p className="text-sm font-mono text-foreground-soft">{project.workspacePath || "—"}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          className="h-9 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
        >
          Export config
        </button>
      </div>

      <div className="border-t border-danger/20 pt-4">
        <p className="text-sm font-semibold text-danger mb-2">Danger Zone</p>
        <p className="text-xs text-foreground-muted mb-4">
          Deleting removes all tasks, pipelines, and memory docs. This cannot be undone.
        </p>
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-xs text-foreground-muted">
              Type <span className="font-mono font-semibold text-foreground">{project.name}</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-danger/30 bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-danger/60"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={confirmText !== project.name}
                className="h-9 px-4 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/80 transition-colors disabled:opacity-40"
              >
                Delete Project
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setConfirmText(""); }}
                className="h-9 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-danger/30 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
          >
            <Trash2 size={14} />
            Delete Project
          </button>
        )}
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "general",       label: "General",            icon: Settings },
  { id: "operation",     label: "Operation",          icon: Zap },
  { id: "model",         label: "Model & Provider",   icon: Cpu },
  { id: "heartbeat",     label: "Heartbeat & Health", icon: Activity },
  { id: "spawn",         label: "Spawn Permissions",  icon: Shield },
  { id: "budget",        label: "Budget & Costs",     icon: DollarSign },
  { id: "notifications", label: "Notifications",      icon: Bell },
  { id: "advanced",      label: "Advanced",           icon: Wrench },
];

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore(selectProjectById(projectId));
  const [openSection, setOpenSection] = useState<string>("general");

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-foreground-muted text-sm">Project not found</p>
      </div>
    );
  }

  const toggleSection = (id: string) =>
    setOpenSection((s) => (s === id ? "" : id));

  return (
    <div className="max-w-2xl space-y-3">
      {SECTIONS.map(({ id, label, icon }) => (
        <Section
          key={id}
          icon={icon}
          title={label}
          open={openSection === id}
          onToggle={() => toggleSection(id)}
        >
          {id === "general"       && <SectionGeneral       projectId={projectId} />}
          {id === "operation"     && <SectionOperation     projectId={projectId} />}
          {id === "model"         && <SectionModel         projectId={projectId} />}
          {id === "heartbeat"     && <SectionHeartbeat     projectId={projectId} />}
          {id === "spawn"         && <SectionSpawn         projectId={projectId} />}
          {id === "budget"        && <SectionBudget        projectId={projectId} />}
          {id === "notifications" && <SectionNotifications projectId={projectId} />}
          {id === "advanced"      && <SectionAdvanced      projectId={projectId} />}
        </Section>
      ))}
    </div>
  );
}
