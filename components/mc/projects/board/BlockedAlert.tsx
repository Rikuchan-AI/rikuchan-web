"use client";

import { AlertTriangle } from "lucide-react";
import type { Task } from "@/lib/mc/types-project";

interface BlockedAlertProps {
  task: Task;
  onReassign: () => void;
  onAddContext: () => void;
}

export function BlockedAlert({ task, onReassign, onAddContext }: BlockedAlertProps) {
  const blockCount = task.executionLog?.filter((m) =>
    m.content?.toLowerCase().includes("blocked") ||
    m.content?.toLowerCase().includes("missing data") ||
    m.content?.toLowerCase().includes("access issues")
  ).length ?? 0;

  const minutesAgo = Math.floor((Date.now() - task.updatedAt) / 60000);

  return (
    <div className="mx-5 mt-3 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3" style={{ borderLeftWidth: "3px", borderLeftColor: "var(--danger)" }}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-danger flex-shrink-0" />
        <span className="text-sm font-medium text-danger">Task blocked</span>
        {blockCount > 1 && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-danger/10 text-danger">
            &times;{blockCount}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-danger/80 leading-relaxed">
        Agent reported missing data or access issues
        {blockCount > 1 ? ` \u00b7 ${blockCount} attempts` : ""}
        {minutesAgo > 0 ? ` \u00b7 last ${minutesAgo}m ago` : ""}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onReassign}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
        >
          Reassign agent
        </button>
        <button
          onClick={onAddContext}
          className="rounded-md border border-line-strong bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-strong transition-colors"
        >
          Add context
        </button>
      </div>
    </div>
  );
}
