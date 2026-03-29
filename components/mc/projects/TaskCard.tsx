"use client";

import { useCallback, useState } from "react";
import { Paperclip, GitBranch, RefreshCw, AlertTriangle, Download, Loader2, FileText } from "lucide-react";
import type { Task, FileAttachment, OutputFile } from "@/lib/mc/types-project";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { LivePulse } from "@/components/mc/ui/LivePulse";
import { useElapsedTime } from "@/hooks/use-elapsed-time";
import { toast } from "@/components/shared/toast";

const priorityBorderColor: Record<string, string> = {
  critical: "var(--danger)",
  high:     "var(--warm)",
  medium:   "var(--accent)",
  low:      "#52525b",
};

interface TaskCardProps {
  task: Task;
  agentName?: string;
  onClick?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, agentName, onClick, isDragging }: TaskCardProps) {
  const isBlocked = task.status === "blocked";
  const isRunning = !!task.sessionId && task.status === "progress";
  const isDelegating = task.delegationStatus === "delegating";
  const isLeadUnavailable = task.delegationStatus === "em-unavailable";
  const { elapsed, isOvertime } = useElapsedTime(task.status === "progress" ? task.startedAt : undefined);
  const displayName = agentName ?? task.assignedAgentName;

  const [filesExpanded, setFilesExpanded] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const attachments = task.attachments ?? [];
  const outputFiles = task.outputFiles ?? [];
  const totalFiles = outputFiles.length + attachments.length;

  const handleDownloadOutputFile = useCallback((e: React.MouseEvent, file: OutputFile) => {
    e.stopPropagation();
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadAttachment = useCallback(async (e: React.MouseEvent, file: FileAttachment) => {
    e.stopPropagation();
    setDownloadingId(file.id);
    try {
      const res = await fetch(`/api/mc/files?path=${encodeURIComponent(file.path)}`);
      if (!res.ok) {
        toast("error", "Could not generate download link");
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      toast("error", "Download failed");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleToggleFiles = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFilesExpanded((v) => !v);
  }, []);

  const borderColor = isDelegating
    ? "var(--warm)"
    : isOvertime
      ? "var(--warm)"
      : priorityBorderColor[task.priority] ?? "#52525b";

  const handleClick = () => {
    if (isDragging) return;
    onClick?.();
  };

  // Subtask progress
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.status === "done").length ?? 0;
  const subtaskProgress = subtaskCount > 0 ? (subtaskDone / subtaskCount) * 100 : 0;

  return (
    <div
      className={`group rounded-lg border transition-all duration-150 cursor-pointer ${
        isBlocked
          ? "bg-danger-soft/40 border-danger/20 hover:border-danger/40"
          : isDragging
            ? "bg-surface-strong border-accent/30 shadow-lg shadow-accent/5"
            : "bg-surface-strong/80 border-line/60 hover:border-line-strong hover:bg-surface-strong"
      } ${isDelegating ? "animate-pulse" : ""}`}
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
      onClick={handleClick}
      title={task.description || task.title}
    >
      {/* Main content area */}
      <div className="px-3 pt-3 pb-2.5">
        {/* Header: title + priority */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
            {task.title}
          </h4>
          <TaskPriorityBadge priority={task.priority} />
        </div>

        {/* Description — compact */}
        {task.description && (
          <p className="text-[11px] text-foreground-muted leading-snug line-clamp-1 mb-2">
            {task.description}
          </p>
        )}

        {/* Tags — inline */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.55rem] text-foreground-muted font-medium"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[0.55rem] text-foreground-muted/60">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Metadata row: agent + attachments + deps */}
        <div className="flex items-center gap-2 mt-1">
          {isDelegating ? (
            <span className="text-[11px] text-warning italic">Lead deciding...</span>
          ) : isLeadUnavailable ? (
            <span className="text-[11px] text-foreground-muted">Lead unavailable</span>
          ) : displayName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/15 text-accent text-[0.5rem] font-bold flex-shrink-0">
                {displayName
                  .split(/[\s-]+/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
              <span className="mono text-[11px] text-foreground-muted truncate">{displayName}</span>
            </div>
          ) : (
            <span className="text-[11px] text-foreground-muted/50">Unassigned</span>
          )}

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* Retry count */}
            {(task.retryCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400" title={`Retry ${task.retryCount}/3`}>
                <RefreshCw size={9} />
                <span className="mono text-[9px]">{task.retryCount}</span>
              </span>
            )}
            {/* Escalated */}
            {task.escalatedAt && (
              <span className="text-red-400" title="Escalated">
                <AlertTriangle size={9} />
              </span>
            )}
            {/* File count — clickable to expand file list */}
            {totalFiles > 0 && (
              <button
                onClick={handleToggleFiles}
                className="flex items-center gap-0.5 text-foreground-muted/60 hover:text-accent transition-colors"
                title={filesExpanded ? "Hide files" : "Show files for download"}
              >
                <Paperclip size={9} />
                <span className="mono text-[9px]">{totalFiles}</span>
              </button>
            )}
            {/* Dependencies */}
            {task.dependsOn && task.dependsOn.length > 0 && (
              <span className="flex items-center gap-0.5 text-foreground-muted/60" title={`Depends on ${task.dependsOn.length} task(s)`}>
                <GitBranch size={9} />
                <span className="mono text-[9px]">{task.dependsOn.length}</span>
              </span>
            )}
          </div>
        </div>

        {/* EM Rationale — compact */}
        {task.emDecisionReason && !isDelegating && (
          <p className="mt-1.5 text-[10px] text-foreground-muted/70 italic line-clamp-1">
            &ldquo;{task.emDecisionReason}&rdquo;
          </p>
        )}
      </div>

      {/* Expandable file downloads */}
      {filesExpanded && totalFiles > 0 && (
        <div className="px-3 pb-2 border-t border-line/20">
          <p className="mono text-[8px] uppercase tracking-wider text-foreground-muted/60 mt-2 mb-1.5">
            Files ({totalFiles})
          </p>
          <div className="space-y-1">
            {/* Output files — generated by agent, stored with content */}
            {outputFiles.map((file, i) => {
              const truncated = file.name.length > 28
                ? file.name.slice(0, 20) + "..." + file.name.slice(file.name.lastIndexOf("."))
                : file.name;

              return (
                <div
                  key={`output-${i}`}
                  className="flex items-center gap-2 rounded-md bg-accent-soft/20 px-2 py-1.5"
                >
                  <FileText size={9} className="text-accent flex-shrink-0" />
                  <span className="text-[11px] text-foreground-soft truncate flex-1" title={file.name}>
                    {truncated}
                  </span>
                  <button
                    onClick={(e) => handleDownloadOutputFile(e, file)}
                    className="flex h-5 w-5 items-center justify-center rounded text-accent hover:bg-accent-soft transition-colors flex-shrink-0"
                    title={`Download ${file.name}`}
                  >
                    <Download size={10} />
                  </button>
                </div>
              );
            })}
            {/* Uploaded attachments */}
            {attachments.map((file) => {
              const fileName = file.label ?? file.path.split("/").pop() ?? "file";
              const truncated = fileName.length > 28
                ? fileName.slice(0, 20) + "..." + fileName.slice(fileName.lastIndexOf("."))
                : fileName;

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-2 rounded-md bg-surface-muted/50 px-2 py-1.5"
                >
                  <Paperclip size={9} className="text-foreground-muted/50 flex-shrink-0" />
                  <span className="text-[11px] text-foreground-soft truncate flex-1" title={fileName}>
                    {truncated}
                  </span>
                  <button
                    onClick={(e) => handleDownloadAttachment(e, file)}
                    disabled={downloadingId === file.id}
                    className="flex h-5 w-5 items-center justify-center rounded text-foreground-muted/50 hover:text-accent hover:bg-accent-soft transition-colors flex-shrink-0 disabled:opacity-50"
                    title={`Download ${fileName}`}
                  >
                    {downloadingId === file.id ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Download size={10} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtask progress bar */}
      {subtaskCount > 0 && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/60 transition-all duration-300"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="mono text-[9px] text-foreground-muted tabular-nums">
              {subtaskDone}/{subtaskCount}
            </span>
          </div>
        </div>
      )}

      {/* Running status bar */}
      {(isRunning || (task.status === "progress" && task.startedAt)) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-line/30 bg-surface-muted/30 rounded-b-lg">
          {task.status === "progress" && task.startedAt && (
            <span className={`mono text-[10px] tabular-nums ${isOvertime ? "text-warning animate-pulse" : "text-foreground-muted"}`}>
              {elapsed}
            </span>
          )}
          {isRunning && (
            <div className="flex items-center gap-1 ml-auto">
              <LivePulse color="var(--status-online)" size={5} />
              <span className="mono text-[0.55rem] uppercase font-semibold text-accent" style={{ letterSpacing: "0.06em" }}>
                Running
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
