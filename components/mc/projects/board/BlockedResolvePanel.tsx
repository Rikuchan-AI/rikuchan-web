"use client";

import { useState, useRef } from "react";
import { AlertTriangle, Paperclip, Send, RefreshCw, Users, Crown, Loader2 } from "lucide-react";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { startTaskExecution, triggerEMDelegation } from "@/lib/mc/em-delegation";
import { toast } from "@/components/shared/toast";
import type { Task, Project, FileAttachment } from "@/lib/mc/types-project";

interface BlockedResolvePanelProps {
  task: Task;
  project: Project;
}

export function BlockedResolvePanel({ task, project }: BlockedResolvePanelProps) {
  const updateTask = useProjectsStore((s) => s.updateTask);

  const [context, setContext] = useState("");
  const [fileInput, setFileInput] = useState("");
  const [newFiles, setNewFiles] = useState<FileAttachment[]>([]);
  const [resolving, setResolving] = useState<"retry" | "reassign" | "lead" | null>(null);
  const [reassignAgentId, setReassignAgentId] = useState("");

  const roster = project.roster.filter((m) => m.role !== "lead");
  const hasLead = project.roster.some((m) => m.role === "lead");

  // Extract block reason from execution log
  const blockReason = task.executionLog
    ?.filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("")
    .match(/BLOCKED:(.+?)(?:\n|$)/)?.[1]?.trim()
    ?? task.executionLog
      ?.filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .join("")
      .match(/⚠️ Blocked.*?\n\n([\s\S]*?)(?:\n\n|$)/)?.[1]?.trim()
    ?? "Agent reported an issue preventing task completion.";

  const addFile = () => {
    if (!fileInput.trim()) return;
    setNewFiles([...newFiles, {
      id: `att-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      path: fileInput.trim(),
      addedAt: Date.now(),
    }]);
    setFileInput("");
  };

  const buildRetryContext = () => {
    const parts: string[] = [];
    if (newFiles.length > 0) {
      parts.push(`New files added:\n${newFiles.map((f) => `- ${f.path}`).join("\n")}`);
    }
    if (context.trim()) {
      parts.push(`Additional context from user:\n${context.trim()}`);
    }
    parts.push("The previous block has been resolved. Please retry the task with this updated information.");
    return parts.join("\n\n");
  };

  const handleRetry = async () => {
    setResolving("retry");
    const agent = project.roster.find((m) => m.agentId === task.assignedAgentId);
    if (!agent) { setResolving(null); return; }

    // Update task with new files and unblock
    const allAttachments = [...(task.attachments ?? []), ...newFiles];
    await updateTask(project.id, task.id, {
      status: "progress",
      attachments: allAttachments,
      executionLog: [
        ...(task.executionLog ?? []),
        { role: "system" as const, content: "Block resolved — retrying with updated context", timestamp: Date.now() },
      ],
      updatedAt: Date.now(),
    });

    // Re-execute with additional context
    const updatedTask: Task = {
      ...task,
      status: "progress",
      attachments: allAttachments,
      description: task.description + "\n\n---\n" + buildRetryContext(),
    };
    startTaskExecution(updatedTask, agent, project);
    toast("success", `Retrying "${task.title}" with ${agent.agentName}`);
    setResolving(null);
  };

  const handleReassign = async () => {
    if (!reassignAgentId) return;
    setResolving("reassign");
    const agent = project.roster.find((m) => m.agentId === reassignAgentId);
    if (!agent) { setResolving(null); return; }

    const allAttachments = [...(task.attachments ?? []), ...newFiles];
    await updateTask(project.id, task.id, {
      status: "progress",
      assignedAgentId: reassignAgentId,
      assignedAgentName: agent.agentName,
      attachments: allAttachments,
      executionLog: [
        ...(task.executionLog ?? []),
        { role: "system" as const, content: `Reassigned to ${agent.agentName} after block`, timestamp: Date.now() },
      ],
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });

    const updatedTask: Task = {
      ...task,
      status: "progress",
      assignedAgentId: reassignAgentId,
      assignedAgentName: agent.agentName,
      attachments: allAttachments,
      description: task.description + (context.trim() ? "\n\n---\n" + buildRetryContext() : ""),
    };
    startTaskExecution(updatedTask, agent, project);
    toast("success", `Reassigned to ${agent.agentName}`);
    setResolving(null);
  };

  const handleAskLead = async () => {
    setResolving("lead");

    // Build a task for the lead that includes block context
    const blockedTask: Task = {
      ...task,
      description: `BLOCKED TASK RESOLUTION REQUEST:

Original task: "${task.title}"
${task.description}

BLOCK REASON:
${blockReason}

${context.trim() ? `USER CONTEXT:\n${context.trim()}\n` : ""}
${newFiles.length > 0 ? `NEW FILES PROVIDED:\n${newFiles.map((f) => `- ${f.path}`).join("\n")}\n` : ""}
Analyze this blocked task and decide:
1. Can another agent in the roster handle it? If so, reassign.
2. Should a sub-task be created to resolve the blocker first?
3. Is more information needed from the user?

Respond with your decision and action.`,
    };

    const decision = await triggerEMDelegation(blockedTask, project);
    if (decision) {
      toast("success", `Lead assigned resolution to ${decision.assignedAgentName}`);
    } else {
      toast("error", "Lead could not resolve — try manual resolution");
    }
    setResolving(null);
  };

  return (
    <div className="rounded-lg border border-danger/20 bg-danger-soft/30 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-danger flex-shrink-0" />
        <h3 className="text-sm font-semibold text-danger">Blocked</h3>
      </div>

      {/* Block reason */}
      <div className="rounded-md bg-surface-muted border border-line p-3">
        <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.12em" }}>
          Agent reported
        </p>
        <p className="text-sm text-foreground-soft leading-relaxed">{blockReason}</p>
      </div>

      {/* Resolution section */}
      <div>
        <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-3" style={{ letterSpacing: "0.12em" }}>
          Resolve this block
        </p>

        {/* Add files */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Paperclip size={12} className="text-foreground-muted flex-shrink-0" />
            <span className="text-xs text-foreground-muted">Add missing files</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={fileInput}
              onChange={(e) => setFileInput(e.target.value)}
              className="flex-1 rounded-md border border-line bg-surface-strong px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50"
              placeholder="path/to/file..."
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFile(); } }}
            />
            <button
              onClick={addFile}
              className="px-2.5 py-1.5 rounded-md border border-line-strong text-xs text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
            >
              Add
            </button>
          </div>
          {newFiles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {newFiles.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1 rounded bg-surface-strong px-2 py-0.5 text-[0.65rem] font-mono text-foreground-muted">
                  {f.path.split("/").pop()}
                  <button onClick={() => setNewFiles(newFiles.filter((nf) => nf.id !== f.id))} className="text-foreground-muted hover:text-danger">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Context */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Send size={12} className="text-foreground-muted flex-shrink-0" />
            <span className="text-xs text-foreground-muted">Add context for the agent</span>
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-accent/50 min-h-[60px]"
            placeholder="Explain what changed, provide missing info..."
          />
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Retry with same agent */}
          <button
            onClick={handleRetry}
            disabled={resolving !== null || !task.assignedAgentId}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
          >
            {resolving === "retry" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {resolving === "retry" ? "Retrying..." : "Retry with same agent"}
          </button>

          <div className="flex gap-2">
            {/* Reassign */}
            <div className="flex-1 flex gap-1.5">
              <select
                value={reassignAgentId}
                onChange={(e) => setReassignAgentId(e.target.value)}
                className="flex-1 rounded-md border border-line bg-surface-strong px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
              >
                <option value="">Pick agent...</option>
                {roster
                  .filter((m) => m.agentId !== task.assignedAgentId)
                  .map((m) => (
                    <option key={m.agentId} value={m.agentId}>{m.agentName} ({m.role})</option>
                  ))}
              </select>
              <button
                onClick={handleReassign}
                disabled={resolving !== null || !reassignAgentId}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-line-strong text-xs font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors disabled:opacity-50"
              >
                {resolving === "reassign" ? <Loader2 size={10} className="animate-spin" /> : <Users size={10} />}
                Reassign
              </button>
            </div>
          </div>

          {/* Ask Lead */}
          {hasLead && (
            <button
              onClick={handleAskLead}
              disabled={resolving !== null}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-line-strong text-xs font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors disabled:opacity-50"
            >
              {resolving === "lead" ? <Loader2 size={12} className="animate-spin" /> : <Crown size={12} />}
              {resolving === "lead" ? "Lead analyzing..." : "Ask Lead to resolve"}
            </button>
          )}
        </div>
      </div>

      {/* Auto-resolution status */}
      {resolving === "lead" && (
        <div className="rounded-md bg-warm-soft border border-warm/15 px-3 py-2 flex items-center gap-2">
          <Loader2 size={12} className="text-warm animate-spin" />
          <span className="text-xs text-warm">Lead is analyzing the block and deciding how to resolve...</span>
        </div>
      )}
    </div>
  );
}
