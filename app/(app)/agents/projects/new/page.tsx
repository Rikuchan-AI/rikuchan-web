"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Crown, Plus, Star } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import Link from "next/link";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { AgentStatusBadge } from "@/components/mc/agents/AgentStatusBadge";
import type {
  Project,
  RosterMember,
  RosterRole,
  OperationMode,
  ProjectModelConfig,
  ProjectHeartbeatConfig,
} from "@/lib/mc/types-project";
import {
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_DEFAULT_HEARTBEAT,
} from "@/lib/mc/types-project";


// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Board Lead" },
  { id: 3, label: "Roster" },
  { id: 4, label: "Config" },
  { id: 5, label: "Review" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                step.id < current
                  ? "bg-accent text-accent-foreground"
                  : step.id === current
                  ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
                  : "bg-surface-strong border border-line text-foreground-muted"
              }`}
            >
              {step.id < current ? <Check size={12} /> : step.id}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                step.id === current ? "text-foreground" : "text-foreground-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-2 h-px w-8 sm:w-12 ${step.id < current ? "bg-accent" : "bg-line"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Shared field label ──────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="mono text-xs uppercase text-foreground-muted block mb-1.5"
      style={{ letterSpacing: "0.18em" }}
    >
      {children}
    </label>
  );
}

// ─── Step 1: Basics ──────────────────────────────────────────────────────────

function StepBasics({
  name,
  description,
  groupId,
  tags,
  onNameChange,
  onDescriptionChange,
  onGroupIdChange,
  onTagsChange,
}: {
  name: string;
  description: string;
  groupId: string;
  tags: string[];
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onGroupIdChange: (v: string) => void;
  onTagsChange: (v: string[]) => void;
}) {
  const groups = useProjectsStore((s) => s.groups);
  const [tagInput, setTagInput] = useState("");

  const addTag = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase();
      if (!tags.includes(t)) onTagsChange([...tags, t]);
      setTagInput("");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Project Name *</FieldLabel>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
          placeholder="e.g. CVC Homologação"
        />
      </div>

      <div>
        <FieldLabel>Description *</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors min-h-[80px] resize-none"
          placeholder="What is this project about?"
        />
      </div>

      <div>
        <FieldLabel>Group *</FieldLabel>
        {groups.length === 0 ? (
          <div className="rounded-md border border-warning/20 bg-warm-soft px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-warning">No groups yet. Create one first to organize projects.</p>
            <Link
              href="/agents/groups"
              className="text-xs text-accent hover:text-accent-deep font-medium shrink-0 ml-4"
            >
              Create group →
            </Link>
          </div>
        ) : (
          <Combobox
            value={groupId}
            onChange={onGroupIdChange}
            placeholder="Select a group..."
            options={groups.map((g) => ({ id: g.id, label: `${g.icon ? g.icon + " " : ""}${g.name}` }))}
          />
        )}
      </div>

      <div>
        <FieldLabel>Tags</FieldLabel>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md bg-surface-strong border border-line px-2 py-0.5 text-xs text-foreground-muted"
            >
              {t}
              <button
                type="button"
                onClick={() => onTagsChange(tags.filter((x) => x !== t))}
                className="hover:text-danger transition-colors ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={addTag}
          placeholder="Type a tag and press Enter"
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Step 2: Board Lead ──────────────────────────────────────────────────────

function StepLead({
  leadAgentId,
  onLeadChange,
}: {
  leadAgentId: string;
  onLeadChange: (id: string, model: string) => void;
}) {
  const agents = useGatewayStore((s) => s.agents);
  const agentsLoaded = useGatewayStore((s) => s.agentsLoaded);
  const projects = useProjectsStore((s) => s.projects);

  const leadProjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) {
      const lead = p.roster.find((m) => m.role === "lead");
      if (lead) map[lead.agentId] = p.name;
    }
    return map;
  }, [projects]);

  if (!agentsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-foreground-muted">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-sm">Loading agents from gateway...</p>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-md border border-warning/20 bg-warm-soft px-4 py-5 text-center space-y-3">
        <AlertTriangle size={20} className="text-warning mx-auto" />
        <p className="text-sm text-warning">No agents connected to gateway.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/agents/new" className="text-xs text-accent hover:text-accent-deep font-medium">
            Create Agent →
          </Link>
          <Link href="/agents/gateway" className="text-xs text-accent hover:text-accent-deep font-medium">
            Connect Gateway →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-muted">
        The Board Lead orchestrates the project — delegating tasks, running standups, and coordinating the roster.
      </p>
      <div className="rounded-lg border border-line overflow-hidden divide-y divide-line">
        {agents.map((agent) => {
          const isLead = agent.id === leadAgentId;
          const existingProject = leadProjectMap[agent.id];
          return (
            <label
              key={agent.id}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                isLead ? "bg-accent-soft" : "hover:bg-surface-strong"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    isLead ? "border-accent bg-accent" : "border-line-strong"
                  }`}
                >
                  {isLead && <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />}
                </div>
                <input
                  type="radio"
                  name="lead-agent"
                  value={agent.id}
                  checked={isLead}
                  onChange={() => onLeadChange(agent.id, agent.model ?? "")}
                  className="sr-only"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isLead ? "text-accent" : "text-foreground"}`}>
                      {agent.name}
                    </span>
                    {existingProject && (
                      <span className="rounded-md bg-warning/10 border border-warning/20 px-1.5 py-0.5 text-[10px] text-warning">
                        Lead in {existingProject}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-foreground-muted">{agent.role}</span>
                    {agent.model && (
                      <span className="mono text-[10px] text-foreground-muted/70">{agent.model}</span>
                    )}
                  </div>
                </div>
              </div>
              <AgentStatusBadge status={agent.status} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Roster ──────────────────────────────────────────────────────────

const ROSTER_ROLES: { value: RosterRole; label: string }[] = [
  { value: "developer",  label: "Developer" },
  { value: "reviewer",   label: "Reviewer" },
  { value: "researcher", label: "Researcher" },
  { value: "documenter", label: "Documenter" },
  { value: "custom",     label: "Custom" },
];

function StepRoster({
  leadAgentId,
  rosterMembers,
  onRosterChange,
}: {
  leadAgentId: string;
  rosterMembers: RosterMember[];
  onRosterChange: (members: RosterMember[]) => void;
}) {
  const agents = useGatewayStore((s) => s.agents);
  const eligibleAgents = agents.filter((a) => a.id !== leadAgentId);

  const isInRoster = (agentId: string) => rosterMembers.some((m) => m.agentId === agentId);
  const getMember = (agentId: string) => rosterMembers.find((m) => m.agentId === agentId);

  const toggleAgent = (agentId: string, agentName: string) => {
    if (isInRoster(agentId)) {
      onRosterChange(rosterMembers.filter((m) => m.agentId !== agentId));
    } else {
      const newMember: RosterMember = {
        agentId,
        agentName,
        role: "developer",
        permissions: ROLE_DEFAULT_PERMISSIONS["developer"],
        heartbeatConfig: ROLE_DEFAULT_HEARTBEAT["developer"],
        addedAt: Date.now(),
      };
      onRosterChange([...rosterMembers, newMember]);
    }
  };

  const updateRole = (agentId: string, role: RosterRole, customLabel?: string) => {
    onRosterChange(
      rosterMembers.map((m) =>
        m.agentId === agentId
          ? {
              ...m,
              role,
              customRoleLabel: customLabel,
              permissions: ROLE_DEFAULT_PERMISSIONS[role],
              heartbeatConfig: ROLE_DEFAULT_HEARTBEAT[role],
            }
          : m,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          Add agents to the project roster. Each gets a role that defines default permissions and heartbeat.
        </p>
        <span className="text-xs text-foreground-muted">
          {rosterMembers.length} selected
          {rosterMembers.length > 0 && rosterMembers.length <= 5 && (
            <span className="text-success ml-1">· Good</span>
          )}
          {rosterMembers.length > 5 && (
            <span className="text-warning ml-1">· Consider splitting</span>
          )}
        </span>
      </div>

      {eligibleAgents.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-8">
          No other agents available. You can add more agents later.
        </p>
      ) : (
        <div className="rounded-lg border border-line overflow-hidden divide-y divide-line">
          {eligibleAgents.map((agent) => {
            const inRoster = isInRoster(agent.id);
            const member = getMember(agent.id);

            return (
              <div
                key={agent.id}
                className={`px-4 py-3 transition-colors ${inRoster ? "bg-accent-soft/40" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        inRoster ? "border-accent bg-accent" : "border-line-strong"
                      }`}
                      onClick={() => toggleAgent(agent.id, agent.name)}
                    >
                      {inRoster && <Check size={10} className="text-accent-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-foreground-muted">{agent.role}</span>
                        {agent.model && (
                          <span className="mono text-[10px] text-foreground-muted/70">{agent.model}</span>
                        )}
                      </div>
                    </div>
                  </label>

                  <div className="flex items-center gap-2 shrink-0">
                    <AgentStatusBadge status={agent.status} />
                    {inRoster && (
                      <Combobox
                        value={member?.role ?? "developer"}
                        onChange={(v) => updateRole(agent.id, v as RosterRole)}
                        options={ROSTER_ROLES.map((r) => ({ id: r.value, label: r.label }))}
                      />
                    )}
                  </div>
                </div>

                {inRoster && member?.role === "custom" && (
                  <input
                    type="text"
                    value={member.customRoleLabel ?? ""}
                    onChange={(e) => updateRole(agent.id, "custom", e.target.value)}
                    placeholder="Custom role label..."
                    className="mt-2 ml-7 w-[calc(100%-1.75rem)] rounded-md border border-line bg-surface-strong px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent/50"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Config ──────────────────────────────────────────────────────────

function StepConfig({
  operationMode,
  modelConfig,
  heartbeatConfig,
  onModeChange,
  onModelChange,
  onHeartbeatChange,
}: {
  operationMode: OperationMode;
  modelConfig: ProjectModelConfig;
  heartbeatConfig: ProjectHeartbeatConfig;
  onModeChange: (v: OperationMode) => void;
  onModelChange: (v: ProjectModelConfig) => void;
  onHeartbeatChange: (v: ProjectHeartbeatConfig) => void;
}) {
  const gatewayModels = useGatewayStore((s) => s.availableModels);
  const modelGroups = gatewayModels;
  const allModels = modelGroups.flatMap((g) => g.models.map((m) => ({ ...m, provider: g.provider })));

  const MODES: { value: OperationMode; label: string; description: string }[] = [
    {
      value: "manual",
      label: "Manual",
      description: "Tasks must be assigned manually. No automatic delegation.",
    },
    {
      value: "supervised",
      label: "Supervised",
      description: "Lead agent delegates, but humans approve critical actions.",
    },
    {
      value: "autonomous",
      label: "Autonomous",
      description: "Lead agent operates independently. Use with trusted agents.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Operation Mode */}
      <div>
        <FieldLabel>Operation Mode</FieldLabel>
        <div className="space-y-2">
          {MODES.map((m) => (
            <label
              key={m.value}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                operationMode === m.value
                  ? "border-accent/40 bg-accent-soft"
                  : "border-line hover:bg-surface-strong"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                  operationMode === m.value ? "border-accent bg-accent" : "border-line-strong"
                }`}
              >
                {operationMode === m.value && <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />}
              </div>
              <input
                type="radio"
                name="op-mode"
                value={m.value}
                checked={operationMode === m.value}
                onChange={() => onModeChange(m.value)}
                className="sr-only"
              />
              <div>
                <p className={`text-sm font-medium ${operationMode === m.value ? "text-accent" : "text-foreground"}`}>
                  {m.label}
                  {m.value === "supervised" && (
                    <span className="ml-2 text-[10px] rounded-md bg-accent-soft border border-accent/20 px-1.5 py-0.5 text-accent align-middle">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">{m.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Model */}
      <div>
        <FieldLabel>Default Model</FieldLabel>
        <Combobox
          value={modelConfig.preferred}
          onChange={(v) => onModelChange({ ...modelConfig, preferred: v })}
          placeholder="Gateway routing (auto)"
          options={modelGroups.flatMap((g) =>
            g.models.map((m) => ({ id: m.id, label: m.label + (m.recommended ? " ★" : ""), sub: g.provider }))
          )}
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={modelConfig.forced}
            onChange={(e) => onModelChange({ ...modelConfig, forced: e.target.checked })}
            className="rounded border-line"
          />
          <span className="text-xs text-foreground-muted">
            Force model — all agents in this project use this model
          </span>
        </label>
        {modelConfig.preferred && (
          <div className="mt-3">
            <FieldLabel>Fallback Model</FieldLabel>
            <Combobox
              value={modelConfig.fallback ?? ""}
              onChange={(v) => onModelChange({ ...modelConfig, fallback: v || undefined })}
              placeholder="None"
              options={allModels
                .filter((m) => m.id !== modelConfig.preferred)
                .map((m) => ({ id: m.id, label: m.label, sub: m.provider }))}
            />
          </div>
        )}
      </div>

      {/* Heartbeat */}
      <div>
        <FieldLabel>Heartbeat Interval</FieldLabel>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Interval (seconds)</label>
            <input
              type="number"
              min={10}
              max={300}
              value={heartbeatConfig.intervalSeconds}
              onChange={(e) =>
                onHeartbeatChange({ ...heartbeatConfig, intervalSeconds: Number(e.target.value) })
              }
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Degraded after (s)</label>
            <input
              type="number"
              min={10}
              value={heartbeatConfig.degradedThreshold}
              onChange={(e) =>
                onHeartbeatChange({ ...heartbeatConfig, degradedThreshold: Number(e.target.value) })
              }
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="text-xs text-foreground-muted mb-1 block">Offline after (s)</label>
            <input
              type="number"
              min={60}
              value={heartbeatConfig.offlineThreshold}
              onChange={(e) =>
                onHeartbeatChange({ ...heartbeatConfig, offlineThreshold: Number(e.target.value) })
              }
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={heartbeatConfig.autoReassign}
            onChange={(e) => onHeartbeatChange({ ...heartbeatConfig, autoReassign: e.target.checked })}
            className="rounded border-line"
          />
          <span className="text-xs text-foreground-muted">
            Auto-reassign tasks when agent goes offline
          </span>
        </label>
      </div>
    </div>
  );
}

// ─── Step 5: Review ──────────────────────────────────────────────────────────

function StepReview({
  name,
  description,
  groupId,
  leadAgentId,
  rosterMembers,
  operationMode,
  modelConfig,
  tags,
}: {
  name: string;
  description: string;
  groupId: string;
  leadAgentId: string;
  rosterMembers: RosterMember[];
  operationMode: OperationMode;
  modelConfig: ProjectModelConfig;
  tags: string[];
}) {
  const groups = useProjectsStore((s) => s.groups);
  const agents = useGatewayStore((s) => s.agents);

  const group = groups.find((g) => g.id === groupId);
  const leadAgent = agents.find((a) => a.id === leadAgentId);

  const checks = [
    { label: "Group", value: group?.name, ok: !!group },
    { label: "Project name", value: name, ok: !!name },
    { label: "Description", value: description ? `${description.slice(0, 60)}…` : "—", ok: !!description },
    { label: "Board Lead", value: leadAgent?.name ?? "—", ok: !!leadAgent },
    { label: "Roster", value: `${rosterMembers.length} agent${rosterMembers.length !== 1 ? "s" : ""}`, ok: true },
    { label: "Mode", value: operationMode, ok: true },
    { label: "Model", value: modelConfig.preferred || "Gateway routing", ok: true },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">
        Review your project configuration before creating.
      </p>
      <div className="rounded-lg border border-line overflow-hidden divide-y divide-line">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  c.ok ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                }`}
              >
                {c.ok ? <Check size={10} /> : <AlertTriangle size={10} />}
              </div>
              <span className="text-xs font-medium text-foreground-muted uppercase tracking-wide" style={{ letterSpacing: "0.12em" }}>
                {c.label}
              </span>
            </div>
            <span className="text-sm text-foreground font-medium truncate max-w-[60%] text-right">{c.value}</span>
          </div>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-surface-strong border border-line px-2 py-0.5 text-xs text-foreground-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {rosterMembers.length > 0 && (
        <div>
          <FieldLabel>Roster</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {rosterMembers.map((m) => (
              <span
                key={m.agentId}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-strong px-2.5 py-1 text-xs text-foreground"
              >
                {m.agentName}
                <span className="text-foreground-muted">· {m.customRoleLabel ?? m.role}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {operationMode === "autonomous" && (
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warm-soft px-4 py-3">
          <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning">
            Autonomous mode: lead agent will operate without human approvals. Ensure spawn permissions are correctly configured after creation.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function NewProjectPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-foreground-muted text-sm">Loading...</div>}>
      <NewProjectPage />
    </Suspense>
  );
}

function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createProject = useProjectsStore((s) => s.createProject);
  const agents = useGatewayStore((s) => s.agents);

  // Step state
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupId, setGroupId] = useState(searchParams.get("groupId") ?? "");
  const [tags, setTags] = useState<string[]>([]);

  // Step 2
  const [leadAgentId, setLeadAgentId] = useState("");
  const [leadAgentModel, setLeadAgentModel] = useState("");

  // Step 3
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);

  // Step 4
  const [operationMode, setOperationMode] = useState<OperationMode>("supervised");
  const [modelConfig, setModelConfig] = useState<ProjectModelConfig>({
    preferred: "",
    forced: false,
  });
  const [heartbeatConfig, setHeartbeatConfig] = useState<ProjectHeartbeatConfig>({
    intervalSeconds: 30,
    degradedThreshold: 60,
    offlineThreshold: 300,
    autoReassign: false,
  });

  // Validation per step
  const canProceed = useMemo(() => {
    if (step === 1) return !!name.trim() && !!description.trim() && !!groupId;
    if (step === 2) return !!leadAgentId;
    return true;
  }, [step, name, description, groupId, leadAgentId]);

  const handleNext = () => {
    if (canProceed && step < 5) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);

    // Build the lead as a roster member
    const leadAgent = agents.find((a) => a.id === leadAgentId);
    const leadMember: RosterMember = {
      agentId: leadAgentId,
      agentName: leadAgent?.name ?? leadAgentId,
      role: "lead",
      permissions: ROLE_DEFAULT_PERMISSIONS["lead"],
      heartbeatConfig: ROLE_DEFAULT_HEARTBEAT["lead"],
      addedAt: Date.now(),
    };

    const project: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      status: "active",
      workspacePath: "",
      groupId: groupId || undefined,
      leadAgentModel: leadAgentModel || modelConfig.preferred || "",
      operationMode,
      autoDelegation: operationMode === "autonomous",
      modelConfig: modelConfig.preferred ? modelConfig : undefined,
      heartbeatConfig,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roster: [leadMember, ...rosterMembers],
      taskCount: { backlog: 0, progress: 0, review: 0, done: 0 },
      memoryDocCount: 0,
    };

    try {
      await createProject(project);
      router.push(`/agents/projects/${project.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Plan limit exceeded")) {
        setError("You've reached the project limit for your current plan. Upgrade your plan to create more projects.");
      } else {
        setError(msg || "Failed to create project");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Back link */}
      <Link
        href="/agents/projects"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Projects
      </Link>

      {/* Step indicator */}
      <div className="space-y-2">
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create New Project
        </h2>
        <StepIndicator current={step} />
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Crown size={15} className="text-accent" />
          <h3 className="text-base font-semibold text-foreground">
            {STEPS[step - 1].label}
          </h3>
        </div>

        {step === 1 && (
          <StepBasics
            name={name}
            description={description}
            groupId={groupId}
            tags={tags}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onGroupIdChange={setGroupId}
            onTagsChange={setTags}
          />
        )}
        {step === 2 && (
          <StepLead
            leadAgentId={leadAgentId}
            onLeadChange={(id, model) => { setLeadAgentId(id); setLeadAgentModel(model); }}
          />
        )}
        {step === 3 && (
          <StepRoster
            leadAgentId={leadAgentId}
            rosterMembers={rosterMembers}
            onRosterChange={setRosterMembers}
          />
        )}
        {step === 4 && (
          <StepConfig
            operationMode={operationMode}
            modelConfig={modelConfig}
            heartbeatConfig={heartbeatConfig}
            onModeChange={setOperationMode}
            onModelChange={setModelConfig}
            onHeartbeatChange={setHeartbeatConfig}
          />
        )}
        {step === 5 && (
          <StepReview
            name={name}
            description={description}
            groupId={groupId}
            leadAgentId={leadAgentId}
            rosterMembers={rosterMembers}
            operationMode={operationMode}
            modelConfig={modelConfig}
            tags={tags}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">
            Step {step} of {STEPS.length}
          </span>
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger max-w-sm">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{error}</span>
                  {error.includes("plan") && (
                    <Link href="/dashboard/plans" className="text-accent hover:text-accent-deep font-medium shrink-0 ml-1">
                      Upgrade
                    </Link>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create Project"}
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
