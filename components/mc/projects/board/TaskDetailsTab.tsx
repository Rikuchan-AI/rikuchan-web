"use client";

import { useState } from "react";
import { Clock, Tag, GitBranch, FileText, User, CheckCircle2, Edit3, Save } from "lucide-react";
import type { Task, RosterMember } from "@/lib/mc/types-project";
import { getBlockingDeps } from "@/lib/mc/types-project";
import { useProjectsStore, useProjectTasks } from "@/lib/mc/projects-store";
import { formatRelativeTime } from "@/lib/mc/mc-utils";

interface TaskDetailsTabProps {
  task: Task;
  projectId: string;
  roster: RosterMember[];
}

export function TaskDetailsTab({ task, projectId, roster }: TaskDetailsTabProps) {
  const updateTask = useProjectsStore((s) => s.updateTask);
  const allTasks = useProjectTasks(projectId);
  const blockingDeps = getBlockingDeps(task, allTasks);

  const [editingContext, setEditingContext] = useState(false);
  const [contextDraft, setContextDraft] = useState(task.contextNote ?? "");

  const handleSaveContext = () => {
    updateTask(projectId, task.id, { contextNote: contextDraft.trim() || undefined });
    setEditingContext(false);
  };

  const assignedAgent = roster.find((m) => m.agentId === task.assignedAgentId);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetadataItem icon={<Clock size={12} />} label="Created" value={formatRelativeTime(task.createdAt)} />
        <MetadataItem icon={<User size={12} />} label="Created by" value={task.createdBy === "user" ? "Human" : task.createdBy === "lead-agent" ? "Lead Agent" : "Pipeline"} />
        {task.startedAt && <MetadataItem icon={<Clock size={12} />} label="Started" value={formatRelativeTime(task.startedAt)} />}
        {task.completedAt && <MetadataItem icon={<CheckCircle2 size={12} />} label="Completed" value={formatRelativeTime(task.completedAt)} />}
        {task.taskType && <MetadataItem icon={<FileText size={12} />} label="Type" value={task.taskType === "organization" ? "Organization" : "Execution"} />}
        {assignedAgent && (
          <MetadataItem icon={<User size={12} />} label="Assigned to" value={`${assignedAgent.agentName} (${assignedAgent.customRoleLabel ?? assignedAgent.role})`} />
        )}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <Section title="Tags" icon={<Tag size={12} />}>
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-surface-strong border border-line px-2 py-0.5 text-xs text-foreground-muted">
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Dependencies */}
      {task.dependsOn && task.dependsOn.length > 0 && (
        <Section title="Dependencies" icon={<GitBranch size={12} />}>
          <div className="space-y-1.5">
            {task.dependsOn.map((depId) => {
              const dep = allTasks.find((t) => t.id === depId);
              const isBlocking = blockingDeps.some((d) => d.id === depId);
              return (
                <div
                  key={depId}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs ${
                    isBlocking
                      ? "bg-danger-soft/40 border border-danger/20 text-danger"
                      : "bg-surface-muted border border-line/30 text-foreground-soft"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isBlocking ? "bg-danger" : "bg-accent"}`} />
                  <span className="truncate flex-1">{dep?.title ?? depId}</span>
                  <span className="mono text-[10px] text-foreground-muted uppercase">{dep?.status ?? "unknown"}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Context Note */}
      <Section
        title="Context Note"
        icon={<FileText size={12} />}
        action={
          !editingContext ? (
            <button onClick={() => { setContextDraft(task.contextNote ?? ""); setEditingContext(true); }} className="text-[10px] text-accent hover:text-accent-deep transition-colors flex items-center gap-1">
              <Edit3 size={10} /> Edit
            </button>
          ) : (
            <button onClick={handleSaveContext} className="text-[10px] text-accent hover:text-accent-deep transition-colors flex items-center gap-1">
              <Save size={10} /> Save
            </button>
          )
        }
      >
        {editingContext ? (
          <textarea
            autoFocus
            value={contextDraft}
            onChange={(e) => setContextDraft(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none resize-none"
            placeholder="Add context for the agent..."
            onKeyDown={(e) => { if (e.key === "Escape") setEditingContext(false); }}
          />
        ) : task.contextNote ? (
          <p className="text-sm text-foreground-soft leading-relaxed whitespace-pre-wrap">{task.contextNote}</p>
        ) : (
          <p className="text-sm text-foreground-muted/50 italic">No context note</p>
        )}
      </Section>

      {/* Context Files */}
      {task.contextFiles && task.contextFiles.length > 0 && (
        <Section title="Context Files" icon={<FileText size={12} />}>
          <div className="space-y-1.5">
            {task.contextFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 rounded-md bg-surface-muted px-2.5 py-2 border border-line/30">
                <FileText size={12} className="text-foreground-muted flex-shrink-0" />
                <span className="text-xs text-foreground truncate">{file.name}</span>
                <span className="mono text-[9px] text-foreground-muted/60 ml-auto flex-shrink-0">{formatRelativeTime(file.addedAt)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Subtasks summary */}
      {task.subtasks && task.subtasks.length > 0 && (
        <Section title="Subtasks" icon={<CheckCircle2 size={12} />}>
          <div className="space-y-1.5">
            {task.subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2 rounded-md bg-surface-muted px-2.5 py-2 border border-line/30">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sub.status === "done" ? "bg-accent" : sub.status === "blocked" ? "bg-danger" : sub.status === "progress" ? "bg-amber-400" : "bg-foreground-muted/40"}`} />
                <span className="text-xs text-foreground-soft truncate flex-1">{sub.title}</span>
                {sub.assignedAgentName && (
                  <span className="mono text-[10px] text-foreground-muted flex-shrink-0">{sub.assignedAgentName}</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Task ID (debug) */}
      <div className="pt-3 border-t border-line/30">
        <p className="mono text-[10px] text-foreground-muted/40 select-all">{task.id}</p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetadataItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-surface-muted/50 px-2.5 py-2 border border-line/20">
      <span className="text-foreground-muted mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="mono text-[9px] uppercase tracking-wider text-foreground-muted/60">{label}</p>
        <p className="text-xs text-foreground-soft truncate">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-foreground-muted">
          {icon}
          <span className="mono text-[10px] uppercase tracking-wider font-medium">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
