"use client";

import { useCallback, useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import type { Task, FileAttachment } from "@/lib/mc/types-project";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { formatRelativeTime } from "@/lib/mc/mc-utils";

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

  const attachments = task.attachments ?? [];

  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const now = Date.now();
      const newAttachments: FileAttachment[] = Array.from(files).map((file, i) => ({
        id: `file-${now}-${i}-${Math.random().toString(16).slice(2, 6)}`,
        path: file.name,
        label: file.name,
        addedAt: now,
      }));

      updateTask(projectId, task.id, {
        attachments: [...attachments, ...newAttachments],
      });

      // Reset file input
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

  // Truncate long filenames
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
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted/40 hover:text-danger hover:bg-danger-soft transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-foreground-muted">No files attached</p>
        </div>
      )}

      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors flex-shrink-0 ${
          dragging
            ? "border-accent/60 bg-accent/5"
            : "border-line hover:border-accent/40 bg-surface-muted/50 hover:bg-accent-soft/10"
        }`}
      >
        <Upload size={20} className={dragging ? "text-accent" : "text-foreground-muted"} />
        <p className="text-xs text-foreground-muted">
          {dragging ? (
            <span className="text-accent font-medium">Release to attach</span>
          ) : (
            <>Drop files or <span className="text-accent">browse</span></>
          )}
        </p>
        <p className="text-[10px] text-foreground-muted/60">Multiple files supported</p>
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
