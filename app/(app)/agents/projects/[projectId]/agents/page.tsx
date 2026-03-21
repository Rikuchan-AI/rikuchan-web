"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Crown, FileText, X, ChevronDown,
  ChevronRight, Plus, UserMinus,
} from "lucide-react";
import Link from "next/link";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { AgentStatusBadge } from "@/components/mc/agents/AgentStatusBadge";
import type { RosterMember, RosterContextFile, RosterRole } from "@/lib/mc/types-project";
import { ROLE_DEFAULT_PERMISSIONS, ROLE_DEFAULT_HEARTBEAT } from "@/lib/mc/types-project";
import { FileDropzone } from "@/components/shared/file-dropzone";

// ─── Context overlay editor ────────────────────────────────────────────────────

function ContextEditor({
  member,
  onSave,
}: {
  member: RosterMember;
  onSave: (overlay: string, files: RosterContextFile[]) => void;
}) {
  const [overlay, setOverlay] = useState(member.contextOverlay ?? "");
  const [files, setFiles] = useState<RosterContextFile[]>(member.contextFiles ?? []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(overlay, files);
    setSaving(false);
  };

  const hasChanges =
    overlay !== (member.contextOverlay ?? "") ||
    JSON.stringify(files) !== JSON.stringify(member.contextFiles ?? []);

  return (
    <div className="space-y-4">
      <div>
        <label className="mono text-[10px] uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
          Context Overlay
        </label>
        <textarea
          value={overlay}
          onChange={(e) => setOverlay(e.target.value)}
          placeholder={`Specific instructions for ${member.agentName} in this project...`}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent/50 resize-none min-h-[100px]"
          spellCheck={false}
        />
        <p className="mt-1 text-[10px] text-foreground-muted">
          Injected between SOUL.md and the task prompt. Keep concise.
        </p>
      </div>

      <div>
        <label className="mono text-[10px] uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
          Context Files {files.length > 0 && `(${files.length})`}
        </label>
        <FileDropzone
          files={files}
          onChange={setFiles}
          id={`ctx-files-${member.agentId}`}
        />
        <p className="mt-1 text-[10px] text-foreground-muted">
          Markdown, code, specs, YAML — text files only. Summarized in the prompt.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="h-8 px-4 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Context"}
        </button>
      </div>
    </div>
  );
}

// ─── Roster member card ───────────────────────────────────────────────────────

function RosterMemberCard({
  member,
  agentStatus,
  currentTask,
  projectId,
  onUpdateMember,
  onRemoveMember,
}: {
  member: RosterMember;
  agentStatus?: string;
  currentTask?: string;
  projectId: string;
  onUpdateMember: (agentId: string, updates: Partial<RosterMember>) => void;
  onRemoveMember: (agentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasContext =
    (member.contextOverlay && member.contextOverlay.length > 0) ||
    (member.contextFiles && member.contextFiles.length > 0);

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {member.role === "lead" && (
            <Crown size={14} className="text-warning shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/agents/${member.agentId}`}
                className="text-sm font-semibold text-foreground hover:text-accent transition-colors truncate"
              >
                {member.agentName}
              </Link>
              <span className="rounded-md bg-surface-strong border border-line px-1.5 py-0.5 text-[10px] text-foreground-muted">
                {member.customRoleLabel ?? member.role}
              </span>
              {member.role === "lead" && (
                <span className="rounded-md bg-warning/10 border border-warning/20 px-1.5 py-0.5 text-[10px] text-warning">Lead</span>
              )}
            </div>

            {currentTask && (
              <p className="mt-1 text-xs text-foreground-muted truncate">{currentTask}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* @ts-ignore – AgentStatus type is compatible */}
          {agentStatus && <AgentStatusBadge status={agentStatus as any} />}

          {hasContext && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft border border-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
              <FileText size={9} />
              ctx
            </span>
          )}

          {member.role !== "lead" && (
            <button
              type="button"
              onClick={() => onRemoveMember(member.agentId)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-danger/10 hover:text-danger transition-colors"
              title="Remove from roster"
            >
              <UserMinus size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-strong hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Permissions summary */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {Object.entries(member.permissions).map(([perm, enabled]) => (
          <span
            key={perm}
            className={`rounded-md px-1.5 py-0.5 text-[10px] border ${
              enabled
                ? "bg-success/10 border-success/20 text-success"
                : "bg-surface-strong border-line text-foreground-muted/50"
            }`}
          >
            {perm.replace(/([A-Z])/g, " $1").toLowerCase()}
          </span>
        ))}
      </div>

      {/* Context editor (expanded) */}
      {expanded && (
        <div className="border-t border-line p-4">
          <p className="mono text-[10px] uppercase text-foreground-muted mb-3" style={{ letterSpacing: "0.18em" }}>
            Project Context for {member.agentName}
          </p>
          <ContextEditor
            member={member}
            onSave={(overlay, files) =>
              onUpdateMember(member.agentId, { contextOverlay: overlay, contextFiles: files })
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: RosterRole; label: string }[] = [
  { value: "developer",  label: "Developer" },
  { value: "reviewer",   label: "Reviewer" },
  { value: "researcher", label: "Researcher" },
  { value: "documenter", label: "Documenter" },
  { value: "lead",       label: "Lead" },
  { value: "custom",     label: "Custom" },
];

export default function RosterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore(selectProjectById(projectId));
  const agents = useGatewayStore((s) => s.agents);
  const updateProject = useProjectsStore((s) => s.updateProject);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedRole, setSelectedRole] = useState<RosterRole>("developer");
  const [adding, setAdding] = useState(false);
  const addPanelRef = useRef<HTMLDivElement>(null);

  const roster = project?.roster ?? [];

  // Close add panel on outside click
  useEffect(() => {
    if (!addOpen) return;
    const handler = (e: MouseEvent) => {
      if (addPanelRef.current && !addPanelRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addOpen]);

  const rosterAgentIds = new Set(roster.map((m) => m.agentId));
  const availableAgents = agents.filter((a) => !rosterAgentIds.has(a.id));

  const handleUpdateMember = async (agentId: string, updates: Partial<RosterMember>) => {
    if (!project) return;
    const newRoster = project.roster.map((m) =>
      m.agentId === agentId ? { ...m, ...updates } : m,
    );
    await updateProject(projectId, { roster: newRoster });
  };

  const handleAddMember = async () => {
    if (!project || !selectedAgentId) return;
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;
    setAdding(true);
    const newMember: RosterMember = {
      agentId: agent.id,
      agentName: agent.name,
      role: selectedRole,
      permissions: ROLE_DEFAULT_PERMISSIONS[selectedRole],
      heartbeatConfig: ROLE_DEFAULT_HEARTBEAT[selectedRole],
      addedAt: Date.now(),
    };
    await updateProject(projectId, { roster: [...project.roster, newMember] });
    setAdding(false);
    setAddOpen(false);
    setSelectedAgentId("");
    setSelectedRole("developer");
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!project) return;
    await updateProject(projectId, {
      roster: project.roster.filter((m) => m.agentId !== agentId),
    });
  };

  const leadFirst = [...roster].sort((a, b) => {
    if (a.role === "lead") return -1;
    if (b.role === "lead") return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-xs text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
          {roster.length} AGENT{roster.length !== 1 ? "S" : ""} IN ROSTER
        </p>
        <div className="relative" ref={addPanelRef}>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-line bg-surface hover:bg-surface-strong text-xs text-foreground-soft hover:text-foreground transition-colors"
          >
            <Plus size={12} />
            Add Agent
          </button>

          {addOpen && (
            <div className="absolute right-0 top-9 z-20 w-72 rounded-xl border border-line bg-surface shadow-xl p-4 space-y-3">
              <p className="mono text-[10px] uppercase text-foreground-muted" style={{ letterSpacing: "0.16em" }}>
                Add to Roster
              </p>

              {availableAgents.length === 0 ? (
                <p className="text-xs text-foreground-muted py-2">All agents are already in the roster.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] text-foreground-muted">Agent</label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full rounded-md border border-line bg-surface-strong px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
                    >
                      <option value="">Select agent…</option>
                      {availableAgents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-foreground-muted">Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as RosterRole)}
                      className="w-full rounded-md border border-line bg-surface-strong px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!selectedAgentId || adding}
                    className="w-full h-8 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
                  >
                    {adding ? "Adding…" : "Add to Roster"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {roster.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-foreground-muted text-sm mb-2">No agents in roster</p>
          <p className="text-foreground-muted text-xs">Click "Add Agent" to add agents to this project.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leadFirst.map((member) => {
            const agent = agents.find((a) => a.id === member.agentId);
            return (
              <RosterMemberCard
                key={member.agentId}
                member={member}
                agentStatus={agent?.status}
                currentTask={agent?.currentTask}
                projectId={projectId}
                onUpdateMember={handleUpdateMember}
                onRemoveMember={handleRemoveMember}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
