"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { X, MoreHorizontal, CheckCircle2, Copy, ArrowRight, Trash2, Paperclip, AlertTriangle } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import { TaskPriorityBadge } from "@/components/mc/projects/TaskPriorityBadge";
import { RikuInlineLoader } from "@/components/shared/riku-loader";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { formatRelativeTime } from "@/lib/mc/mc-utils";
import type { Task, ExecutionMessage, TaskStatus } from "@/lib/mc/types-project";
// em-delegation removed — delegation goes through backend API via projects-store
import { toast } from "@/components/shared/toast";
import { DetectedFilesSection } from "./DetectedFilesSection";
import { detectFilePaths } from "@/lib/mc/file-detection";
import { TaskChatPanel } from "./TaskChatPanel";
import { useChatStore } from "@/lib/mc/chat-store";
import { BlockedAlert } from "./BlockedAlert";
import { BlockedResolvePanel } from "./BlockedResolvePanel";
import { TaskActions } from "./TaskActions";
import { TaskFilesTab } from "./TaskFilesTab";
import { TaskDetailsTab } from "./TaskDetailsTab";
import { collapseTimelineEvents, detectTimelineInsight, classifyLogEvent, TIMELINE_COLORS } from "@/lib/mc/timeline-utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  backlog:  "bg-surface-strong text-foreground-muted",
  progress: "bg-accent-soft text-accent",
  review:   "bg-warm-soft text-warm",
  blocked:  "bg-danger-soft text-danger",
  done:     "bg-surface-strong text-foreground-muted",
  paused:   "bg-warm-soft text-warm",
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog", progress: "In Progress", review: "Review",
  blocked: "Blocked", done: "Done", paused: "Paused",
};

/** Consolidate fragmented log entries */
function consolidateLog(log: ExecutionMessage[]): ExecutionMessage[] {
  if (log.length === 0) return [];
  const result: ExecutionMessage[] = [];
  for (const msg of log) {
    const last = result[result.length - 1];
    if (last && last.role === msg.role && msg.role === "assistant") {
      last.content += msg.content;
      last.timestamp = msg.timestamp;
    } else {
      result.push({ ...msg });
    }
  }
  return result.filter((m) => m.content.trim().length > 0);
}

// ─── Execution Log Entry ────────────────────────────────────────────────────

function ExecutionLogEntry({ msg }: { msg: ExecutionMessage }) {
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (msg.role === "system") {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground-muted/40 flex-shrink-0" />
        <span className="text-xs text-foreground-muted">{msg.content}</span>
        <span className="mono text-[10px] text-foreground-muted/40 ml-auto flex-shrink-0">{time}</span>
      </div>
    );
  }

  if (msg.role === "tool") {
    return (
      <div className="flex items-center gap-2 py-1 px-3 rounded-md bg-surface border border-line/30">
        <span className="mono text-[0.65rem] text-foreground-muted">{msg.content}</span>
        <span className="mono text-[10px] text-foreground-muted/40 ml-auto flex-shrink-0">{time}</span>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <details className="group">
        <summary className="flex items-center gap-2 py-1.5 cursor-pointer text-xs text-foreground-muted hover:text-foreground-soft transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/40 flex-shrink-0" />
          <span>Prompt sent to agent</span>
          <span className="mono text-[10px] text-foreground-muted/40 ml-auto flex-shrink-0">{time}</span>
        </summary>
        <div className="mt-1 ml-3.5 rounded-md bg-surface-muted/50 border border-line/30 p-3 text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap max-h-[150px] overflow-y-auto">
          {msg.content}
        </div>
      </details>
    );
  }

  // Assistant — main content card with markdown
  return (
    <div className="rounded-lg bg-surface-muted border border-line/30 p-4">
      <div className="text-sm text-foreground leading-relaxed prose-sm prose-invert max-w-none [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_p]:mb-1.5 [&_p]:last:mb-0 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-0.5 [&_code]:bg-surface [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-accent [&_pre]:bg-surface [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_a]:text-accent [&_a]:underline">
        <Markdown>{msg.content}</Markdown>
      </div>
      <p className="mono text-[10px] text-foreground-muted/40 mt-3">{time}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface TaskDrawerProps {
  task: Task;
  projectId: string;
  onClose: () => void;
}

export function TaskDrawer({ task, projectId, onClose }: TaskDrawerProps) {
  const project = useProjectsStore(selectProjectById(projectId));
  const updateTask = useProjectsStore((s) => s.updateTask);
  const deleteTask = useProjectsStore((s) => s.deleteTask);
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const gwStatus = useGatewayStore((s) => s.status);
  const gwAgents = useGatewayStore((s) => s.agents);
  const { elapsed, isOvertime } = useElapsedTime(task.status === "progress" ? task.startedAt : undefined);

  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "log" | "timeline" | "files" | "details">("chat");
  const [descExpanded, setDescExpanded] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignAgentId, setReassignAgentId] = useState("");

  const chatSession = useChatStore((s) => s.getChatSession({ mode: "task", taskId: task.id }));
  const chatUnread = (chatSession?.messages.length ?? 0) > 0 && chatSession?.messages[chatSession.messages.length - 1]?.role === "agent";

  const assignedMember = project?.roster.find((m) => m.agentId === task.assignedAgentId);
  const roster = project?.roster.filter((m) => m.role !== "lead") ?? [];

  // Auto-scroll log
  useEffect(() => {
    if (activeTab === "log") logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task.executionLog?.length, activeTab]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ─── Timeline ───────────────────────────────────────────────────────

  const rawTimeline = useMemo(() => {
    const events: { label: string; time: number; detail?: string; color?: string }[] = [];
    events.push({ label: "Task created", time: task.createdAt, color: "bg-foreground-muted" });

    if (task.emDelegatedAt && task.assignedAgentName) {
      events.push({ label: `Assigned by Lead \u2192 ${task.assignedAgentName}`, time: task.emDelegatedAt, detail: task.emDecisionReason, color: "bg-accent" });
    } else if (task.assignedAgentName) {
      events.push({ label: "Assigned", time: task.startedAt ?? task.updatedAt, detail: task.assignedAgentName, color: "bg-accent" });
    }

    if (task.startedAt) events.push({ label: "Started execution", time: task.startedAt, color: "bg-warm" });

    if (task.executionLog) {
      for (const msg of task.executionLog) {
        if (msg.role === "system") {
          // Try Phase 2 classification first (nudge, retry, escalation, unblock, etc.)
          const classified = classifyLogEvent(msg.content);
          if (classified) {
            events.push({ label: classified.label, time: msg.timestamp, detail: msg.content, color: classified.color });
          } else if (msg.content.includes("blocked")) {
            events.push({ label: "Blocked", time: msg.timestamp, detail: "Missing data or access issues", color: "bg-danger" });
          } else if (msg.content.includes("completed")) {
            events.push({ label: "Done", time: msg.timestamp, color: "bg-accent" });
          }
        }
      }
    }

    if (task.status === "review" && !events.some((t) => t.label === "Review")) events.push({ label: "Review", time: task.updatedAt, color: "bg-warm" });
    if (task.completedAt && !events.some((t) => t.label === "Done")) events.push({ label: "Done", time: task.completedAt, color: "bg-accent" });

    // Deduplicate
    const seen = new Set<string>();
    return events.filter((t) => {
      const key = `${t.label}-${Math.floor(t.time / 1000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.time - b.time);
  }, [task]);

  const collapsedTimeline = useMemo(() => collapseTimelineEvents(rawTimeline), [rawTimeline]);
  const timelineInsight = useMemo(() => detectTimelineInsight(collapsedTimeline), [collapsedTimeline]);

  // ─── Detected files ─────────────────────────────────────────────────

  const detectedFiles = useMemo(() => {
    const allText = (task.executionLog ?? []).filter((m) => m.role === "assistant").map((m) => m.content).join("\n");
    return detectFilePaths(allText);
  }, [task.executionLog]);

  // ─── Action handlers ────────────────────────────────────────────────

  const handleReassign = () => {
    if (!reassignAgentId || !project) return;
    const agent = project.roster.find((m) => m.agentId === reassignAgentId);
    if (!agent) return;
    updateTask(projectId, task.id, {
      assignedAgentId: reassignAgentId, assignedAgentName: agent.agentName,
      status: "progress", startedAt: Date.now(), updatedAt: Date.now(), delegationStatus: "delegated",
    });
    // Delegation handled by backend
    useProjectsStore.getState().delegateTask(projectId, task.id).catch(() => {});
    toast("success", `Reassigned to ${agent.agentName}`);
    setShowReassign(false);
  };

  const handleMarkBlocked = () => {
    updateTask(projectId, task.id, { status: "blocked", updatedAt: Date.now() });
  };

  const handleCancel = () => {
    const isIdleBacklogTask =
      task.status === "backlog" &&
      !task.assignedAgentId &&
      !task.sessionId &&
      !task.startedAt &&
      (task.executionLog?.length ?? 0) === 0;

    if (isIdleBacklogTask) {
      deleteTask(projectId, task.id);
      toast("success", "Task removida do board");
      onClose();
      return;
    }

    updateTask(projectId, task.id, {
      status: "backlog",
      assignedAgentId: null,
      assignedAgentName: undefined,
      sessionId: undefined,
      startedAt: undefined,
      completedAt: undefined,
      delegationStatus: "idle",
      emDecisionReason: undefined,
      emDelegatedAt: undefined,
      executionLog: [],
      updatedAt: Date.now(),
    });
    toast("success", "Task cancelada e retornada ao backlog");
  };

  const handleMarkDone = () => {
    updateTask(projectId, task.id, { status: "done", completedAt: Date.now(), updatedAt: Date.now() });
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div
        role="dialog"
        aria-label={`Task: ${task.title}`}
        className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* ── 1. Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line flex-shrink-0">
          <button onClick={onClose} className="text-sm text-foreground-soft hover:text-foreground transition-colors">
            &larr; Back
          </button>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors">
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-9 z-10 rounded-lg border border-line bg-surface shadow-xl min-w-[180px] py-1">
                  <button onClick={() => { navigator.clipboard.writeText(task.id); setShowMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors w-full text-left">
                    <Copy size={13} /> Copy ID
                  </button>
                  <button onClick={() => { const next: TaskStatus = task.status === "progress" ? "review" : "progress"; updateTask(projectId, task.id, { status: next, updatedAt: Date.now() }); setShowMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors w-full text-left">
                    <ArrowRight size={13} /> Move to {task.status === "progress" ? "Review" : "In Progress"}
                  </button>
                  <div className="border-t border-line my-1" />
                  <button onClick={() => { setConfirmDelete(true); setShowMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-danger hover:bg-danger-soft transition-colors w-full text-left">
                    <Trash2 size={13} /> Delete Task
                  </button>
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Confirm delete */}
        {confirmDelete && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5">
            <AlertTriangle size={13} className="text-danger shrink-0" />
            <p className="text-xs text-danger flex-1">Delete this task permanently?</p>
            <button onClick={() => setConfirmDelete(false)} className="h-6 px-2 rounded text-xs text-foreground-muted hover:text-foreground">Cancel</button>
            <button onClick={() => { deleteTask(projectId, task.id); onClose(); }} className="h-6 px-2 rounded bg-danger/10 text-xs text-danger hover:bg-danger/20">Delete</button>
          </div>
        )}

        {/* ── 2. Blocked Alert (fixed, only when blocked) ────────────── */}
        {task.status === "blocked" && (
          <BlockedAlert
            task={task}
            onReassign={() => setShowReassign(true)}
            onAddContext={() => { setActiveTab("chat"); setTimeout(() => chatInputRef.current?.focus(), 100); }}
          />
        )}

        {/* ── 3. Scrollable content ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* 3a. Title + badges + description (collapsible) */}
          <div className="px-5 pt-4 pb-3 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <TaskPriorityBadge priority={task.priority} />
              {task.status !== "blocked" && (
                <span className={`rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] ${statusStyles[task.status]}`}>
                  {statusLabels[task.status]}
                </span>
              )}
              {task.status === "progress" && task.startedAt && (
                <span className={`mono text-[11px] ml-auto ${isOvertime ? "text-warning animate-pulse" : "text-foreground-muted"}`}>
                  {elapsed}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground leading-snug" style={{ fontFamily: "var(--font-display)" }}>
              {task.title}
            </h2>
            {task.description && (
              <div className="mt-2">
                <p className={`text-sm text-foreground-soft leading-relaxed ${!descExpanded ? "line-clamp-2" : ""}`}>
                  {task.description}
                </p>
                {task.description.length > 120 && (
                  <button onClick={() => setDescExpanded((v) => !v)} className="mt-1 text-[11px] text-accent hover:text-accent-deep transition-colors">
                    {descExpanded ? "show less" : "show more"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3b. Context strip */}
          <div className="px-5 py-3 border-b border-line flex-shrink-0 space-y-2">
            <div className="flex items-stretch rounded-lg border border-line overflow-hidden bg-surface text-sm">
              {/* Agent */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 flex-1 border-r border-line min-w-0">
                {assignedMember ? (
                  <>
                    <span className="w-6 h-6 rounded-full bg-accent-soft text-accent text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
                      {assignedMember.agentName[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{assignedMember.agentName}</p>
                      <p className="mono text-[10px] text-foreground-muted uppercase" style={{ letterSpacing: "0.06em" }}>{assignedMember.role}</p>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-foreground-muted">Unassigned</span>
                )}
              </div>
              {/* Files count */}
              {(task.attachments?.length ?? 0) + detectedFiles.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2.5 border-r border-line text-foreground-muted">
                  <Paperclip size={11} />
                  <span className="mono text-[11px]">{(task.attachments?.length ?? 0) + detectedFiles.length}</span>
                </div>
              )}
              {/* Running indicator */}
              {task.sessionId && task.status === "progress" && (
                <div className="flex items-center gap-1.5 px-3 py-2.5 text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="mono text-[11px] uppercase font-semibold" style={{ letterSpacing: "0.06em" }}>Running</span>
                </div>
              )}
            </div>

            {/* EM Rationale */}
            {task.emDecisionReason && (
              <div className="rounded-md bg-surface-muted px-3 py-2" style={{ borderLeft: "2px solid var(--line-strong)" }}>
                <p className="mono text-[9px] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.12em" }}>Lead rationale</p>
                <p className="text-[11px] text-foreground-soft leading-relaxed italic">&ldquo;{task.emDecisionReason}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 3c. Tabs + content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar — 5 tabs */}
            <div className="flex gap-1 px-5 pt-3 border-b border-line flex-shrink-0 overflow-x-auto">
              {([
                { id: "chat" as const, label: "Chat", badge: chatUnread },
                { id: "log" as const, label: "Log" },
                { id: "files" as const, label: "Files", count: (task.attachments?.length ?? 0) + detectedFiles.length },
                { id: "details" as const, label: "Details" },
                { id: "timeline" as const, label: "Timeline" },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2 px-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id ? "text-accent border-accent" : "text-foreground-muted border-transparent hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {tab.badge && <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                    {tab.count != null && tab.count > 0 && (
                      <span className="rounded-full bg-surface-strong px-1.5 text-[9px] font-semibold text-foreground-muted tabular-nums">{tab.count}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {/* Chat */}
              {activeTab === "chat" && project && (
                <div className="flex flex-col h-full p-4">
                  <TaskChatPanel task={task} project={project} />
                </div>
              )}

              {/* Execution Log */}
              {activeTab === "log" && (
                <div className="h-full overflow-y-auto p-4 space-y-2">
                  {/* Task result for completed tasks */}
                  {task.status === "done" && (() => {
                    const consolidated = consolidateLog(task.executionLog ?? []);
                    const resultMsg = [...consolidated].reverse().find((m) => m.role === "assistant" && m.content.length > 50);
                    return (
                      <div className="rounded-lg border border-accent/20 bg-accent-soft/30 p-4 mb-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-accent" />
                            <span className="text-sm font-semibold text-accent">Task Completed</span>
                          </div>
                          {task.startedAt && task.completedAt && (
                            <span className="mono text-xs text-foreground-muted">{Math.round((task.completedAt - task.startedAt) / 1000)}s</span>
                          )}
                        </div>
                        {resultMsg && (
                          <div className="rounded-md bg-surface border border-line p-3 max-h-[200px] overflow-y-auto">
                            <div className="text-sm text-foreground leading-relaxed prose-sm prose-invert max-w-none [&_p]:mb-1.5 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:mb-0.5 [&_code]:bg-surface-strong [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_strong]:font-semibold">
                              <Markdown>{resultMsg.content}</Markdown>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Blocked resolve panel */}
                  {task.status === "blocked" && project && (
                    <BlockedResolvePanel task={task} project={project} />
                  )}

                  {/* Delegation failure banner */}
                  {task.delegationStatus === "em-unavailable" && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 mb-3">
                      <p className="text-sm text-red-400 font-medium">Delegation failed</p>
                      <p className="text-xs text-red-400/70 mt-0.5">Agent was unavailable after multiple retries. Move task back to backlog to retry.</p>
                    </div>
                  )}

                  {/* Log entries */}
                  {task.executionLog && task.executionLog.length > 0 ? (
                    <>
                      {consolidateLog(task.executionLog).map((msg, i) => (
                        <ExecutionLogEntry key={i} msg={msg} />
                      ))}
                      {/* Stale task warning: in progress 60s+ with only system logs */}
                      {task.status === "progress" && task.startedAt && Date.now() - task.startedAt > 60_000 && (
                        task.executionLog.every((m) => m.role === "system") && (
                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 mt-2">
                            <p className="text-xs text-amber-400">Agent has not started working. Task may need re-delegation.</p>
                          </div>
                        )
                      )}
                    </>
                  ) : gwStatus !== "connected" ? (
                    <RikuInlineLoader message="Connecting to gateway..." />
                  ) : task.status === "progress" ? (
                    (() => {
                      const assignedGwAgent = gwAgents.find((a) => a.name === task.assignedAgentName);
                      const agentOnline = assignedGwAgent?.status === "online" || assignedGwAgent?.status === "idle" || assignedGwAgent?.status === "thinking";
                      if (assignedGwAgent && !agentOnline) {
                        return (
                          <div className="flex flex-col items-center gap-2 py-8">
                            <div className="h-2 w-2 rounded-full bg-red-400" />
                            <p className="text-sm text-foreground-muted text-center">
                              Agent <span className="text-foreground font-medium">{task.assignedAgentName}</span> is offline
                            </p>
                            <p className="text-xs text-foreground-muted/60">Task will resume when the agent comes back online</p>
                          </div>
                        );
                      }
                      return <RikuInlineLoader message="Starting agent execution..." />;
                    })()
                  ) : (
                    <p className="text-sm text-foreground-muted text-center py-8">No execution data yet</p>
                  )}
                  <div ref={logEndRef} />

                  {/* Detected files */}
                  {detectedFiles.length > 0 && (
                    <div className="mt-2">
                      <DetectedFilesSection files={detectedFiles} agentId={task.assignedAgentId ?? undefined} />
                    </div>
                  )}
                </div>
              )}

              {/* Files */}
              {activeTab === "files" && (
                <TaskFilesTab task={task} projectId={projectId} />
              )}

              {/* Details */}
              {activeTab === "details" && project && (
                <TaskDetailsTab task={task} projectId={projectId} roster={project.roster} />
              )}

              {/* Timeline */}
              {activeTab === "timeline" && (
                <div className="h-full overflow-y-auto p-4">
                  {/* Insight banner */}
                  {timelineInsight && (
                    <div className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 mb-4">
                      <p className="text-xs font-medium text-danger mb-1">Recurring block detected</p>
                      <p className="text-[11px] text-danger/80 leading-relaxed">{timelineInsight}</p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute left-[5px] top-2 bottom-2 w-px bg-line" />
                    <div className="space-y-4">
                      {collapsedTimeline.map((event, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 z-10 ${event.color ?? "bg-accent"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{event.label}</span>
                              {event.count > 1 && (
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-danger/10 text-danger">
                                  &times;{event.count}
                                </span>
                              )}
                            </div>
                            {event.detail && (
                              <p className="text-[11px] text-foreground-soft mt-0.5 leading-relaxed italic">{event.detail}</p>
                            )}
                            <span className="mono text-[10px] text-foreground-muted">
                              {formatRelativeTime(event.firstTimestamp)}
                              {event.count > 1 && ` \u2192 ${formatRelativeTime(event.lastTimestamp)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. Reassign inline (above actions) ─────────────────────── */}
        {showReassign && (
          <div className="px-5 py-3 border-t border-line bg-surface-muted flex-shrink-0">
            <div className="flex gap-2">
              <Combobox
                value={reassignAgentId}
                onChange={setReassignAgentId}
                options={roster.map((m) => ({ id: m.agentId, label: `${m.agentName} (${m.role})` }))}
                placeholder="Select agent..."
              />
              <button onClick={handleReassign} disabled={!reassignAgentId} className="h-9 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50">
                Confirm
              </button>
              <button onClick={() => setShowReassign(false)} className="h-9 px-3 rounded-md border border-line-strong text-xs text-foreground-soft hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── 5. Actions (fixed bottom, contextual by status) ────────── */}
        <TaskActions
          task={task}
          onReassign={() => setShowReassign(true)}
          onMarkBlocked={handleMarkBlocked}
          onCancel={handleCancel}
          onMarkDone={handleMarkDone}
        />
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
