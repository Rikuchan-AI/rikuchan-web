"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip, Upload, X, Download, Loader2, FileText, Package } from "lucide-react";
import type { Task, FileAttachment, OutputFile } from "@/lib/mc/types-project";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { formatRelativeTime } from "@/lib/mc/mc-utils";
import { toast } from "@/components/shared/toast";
import { DetectedFilesSection } from "./DetectedFilesSection";
import { detectFilePaths } from "@/lib/mc/file-detection";
import { useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskFilesTabProps {
  task: Task;
  projectId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskFilesTab({ task, projectId }: TaskFilesTabProps) {
  const updateTask = useProjectsStore((s) => s.updateTask);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const attachments = task.attachments ?? [];

  // Detected files from execution log
  const detectedFiles = useMemo(() => {
    const allText = (task.executionLog ?? []).filter((m) => m.role === "assistant").map((m) => m.content).join("\n");
    return detectFilePaths(allText);
  }, [task.executionLog]);

  const handleFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      const now = Date.now();
      const newAttachments: FileAttachment[] = [];

      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("projectId", projectId);
          formData.append("taskId", task.id);

          const res = await fetch("/api/mc/files", { method: "POST", body: formData });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Upload failed" }));
            toast("error", `Failed to upload ${file.name}: ${err.error}`);
            continue;
          }

          const data = await res.json();
          newAttachments.push({
            id: `file-${now}-${Math.random().toString(16).slice(2, 6)}`,
            path: data.path,
            label: data.name ?? file.name,
            addedAt: now,
          });
        } catch {
          toast("error", `Failed to upload ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        updateTask(projectId, task.id, {
          attachments: [...attachments, ...newAttachments],
        });
        toast("success", `${newAttachments.length} file${newAttachments.length !== 1 ? "s" : ""} uploaded`);
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [attachments, projectId, task.id, updateTask],
  );

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      updateTask(projectId, task.id, {
        attachments: attachments.filter((a) => a.id !== fileId),
      });
    },
    [attachments, projectId, task.id, updateTask],
  );

  const outputFiles = task.outputFiles ?? [];

  const handleDownloadFile = useCallback(async (file: FileAttachment) => {
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
    }
  }, []);

  const handleDownloadOutputFile = useCallback((file: OutputFile) => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const truncateName = (name: string, max: number = 40) => {
    if (name.length <= max) return name;
    const ext = name.lastIndexOf(".");
    if (ext > 0 && name.length - ext <= 8) {
      const extStr = name.slice(ext);
      const base = name.slice(0, max - extStr.length - 3);
      return `${base}...${extStr}`;
    }
    return name.slice(0, max - 3) + "...";
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* File list */}
      {attachments.length > 0 ? (
        <div className="space-y-2 flex-1 overflow-y-auto">
          <p className="mono text-[9px] uppercase tracking-wider text-foreground-muted mb-2">
            Attachments ({attachments.length})
          </p>
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2.5 group"
            >
              <Paperclip size={14} className="text-foreground-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" title={file.label ?? file.path}>
                  {truncateName(file.label ?? file.path)}
                </p>
                <p className="mono text-[10px] text-foreground-muted truncate" title={file.path}>
                  {file.path}
                </p>
              </div>
              <span className="mono text-[10px] text-foreground-muted/60 flex-shrink-0">
                {formatRelativeTime(file.addedAt)}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => handleDownloadFile(file)}
                  className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted/60 hover:text-accent hover:bg-accent-soft transition-colors"
                  title="Download"
                >
                  <Download size={12} />
                </button>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted/40 hover:text-danger hover:bg-danger-soft transition-colors"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : outputFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <FileText size={20} className="text-foreground-muted/30" />
          <p className="text-sm text-foreground-muted">No files attached</p>
          <p className="text-[11px] text-foreground-muted/50">Upload files or drop them below</p>
        </div>
      ) : null}

      {/* Output files — generated by agent, persisted with content */}
      {outputFiles.length > 0 && (
        <div className="rounded-lg border border-accent/20 bg-accent-soft/10 p-3">
          <p className="mono text-[0.6rem] uppercase text-accent mb-2" style={{ letterSpacing: "0.12em" }}>
            <Package size={10} className="inline mr-1 -mt-0.5" />
            Generated Files ({outputFiles.length})
          </p>
          <div className="space-y-1.5">
            {outputFiles.map((file, i) => (
              <div
                key={`output-${i}`}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 group"
              >
                <FileText size={14} className="text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="mono text-[10px] text-foreground-muted">
                    {file.size < 1024
                      ? `${file.size} B`
                      : `${(file.size / 1024).toFixed(1)} KB`}
                    {" · "}
                    {formatRelativeTime(file.detectedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadOutputFile(file)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-accent hover:bg-accent-soft transition-colors"
                  title={`Download ${file.name}`}
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected files from execution (fallback for files not fetched via gateway) */}
      {detectedFiles.length > 0 && (
        <DetectedFilesSection files={detectedFiles} agentId={task.assignedAgentId ?? undefined} />
      )}

      {/* Upload zone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors flex-shrink-0 ${
          uploading
            ? "border-accent/40 bg-accent/5 cursor-wait"
            : dragging
              ? "border-accent/60 bg-accent/5 cursor-copy"
              : "border-line hover:border-accent/40 bg-surface-muted/50 hover:bg-accent-soft/10 cursor-pointer"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={20} className="text-accent animate-spin" />
            <p className="text-xs text-accent font-medium">Uploading...</p>
          </>
        ) : (
          <>
            <Upload size={20} className={dragging ? "text-accent" : "text-foreground-muted"} />
            <p className="text-xs text-foreground-muted">
              {dragging ? (
                <span className="text-accent font-medium">Release to attach</span>
              ) : (
                <>Drop files or <span className="text-accent">browse</span></>
              )}
            </p>
            <p className="text-[10px] text-foreground-muted/60">Max 10 MB per file</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>
    </div>
  );
}
