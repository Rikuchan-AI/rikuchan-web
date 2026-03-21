"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Crown, FileText, Paperclip, X, ChevronDown,
  ChevronRight, Plus, Upload,
} from "lucide-react";
import Link from "next/link";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { AgentStatusBadge } from "@/components/mc/agents/AgentStatusBadge";
import type { RosterMember, RosterContextFile } from "@/lib/mc/types-project";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded) return;
    Array.from(uploaded).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const newFile: RosterContextFile = {
          id: `ctx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          name: file.name,
          content,
          mimeType: file.type,
          addedAt: Date.now(),
        };
        setFiles((prev) => [...prev, newFile]);
      };
      reader.readAsText(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

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

      {/* Context files */}
      <div>
        <label className="mono text-[10px] uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
          Context Files ({files.length})
        </label>

        {files.length > 0 && (
          <div className="space-y-1 mb-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md border border-line bg-surface-strong px-3 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip size={11} className="text-foreground-muted shrink-0" />
                  <span className="text-xs text-foreground truncate">{f.name}</span>
                  <span className="text-[10px] text-foreground-muted shrink-0">
                    {(f.content.length / 1024).toFixed(1)}KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="text-foreground-muted hover:text-danger transition-colors ml-2 shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.txt,.json,.yaml,.yml,.ts,.js,.py,.go,.rb,.sh,.toml,.env.example,.csv"
          onChange={handleFileUpload}
          className="sr-only"
          id={`file-upload-${member.agentId}`}
        />
        <label
          htmlFor={`file-upload-${member.agentId}`}
          className="flex items-center gap-2 w-fit cursor-pointer h-8 px-3 rounded-lg border border-dashed border-line hover:border-accent/40 text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          <Upload size={12} />
          Upload files
        </label>
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
}: {
  member: RosterMember;
  agentStatus?: string;
  currentTask?: string;
  projectId: string;
  onUpdateMember: (agentId: string, updates: Partial<RosterMember>) => void;
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

export default function RosterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore(selectProjectById(projectId));
  const agents = useGatewayStore((s) => s.agents);
  const updateProject = useProjectsStore((s) => s.updateProject);

  const roster = project?.roster ?? [];

  const handleUpdateMember = async (agentId: string, updates: Partial<RosterMember>) => {
    if (!project) return;
    const newRoster = project.roster.map((m) =>
      m.agentId === agentId ? { ...m, ...updates } : m,
    );
    await updateProject(projectId, { roster: newRoster });
  };

  if (roster.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm mb-2">No agents in roster</p>
        <p className="text-foreground-muted text-xs">
          Add agents when creating or editing the project.
        </p>
      </div>
    );
  }

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
        <p className="text-xs text-foreground-muted">
          Expand an agent to edit project-specific context
        </p>
      </div>

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
            />
          );
        })}
      </div>
    </div>
  );
}
