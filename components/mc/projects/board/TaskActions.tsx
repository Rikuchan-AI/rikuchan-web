"use client";

import { useState } from "react";
import type { Task } from "@/lib/mc/types-project";

interface TaskActionsProps {
  task: Task;
  onReassign: () => void;
  onMarkBlocked: () => void;
  onCancel: () => void;
  onMarkDone: () => void;
}

export function TaskActions({ task, onReassign, onMarkBlocked, onCancel, onMarkDone }: TaskActionsProps) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-t border-line bg-surface flex-shrink-0">
      {task.status === "blocked" && (
        <>
          <button
            onClick={onReassign}
            className="rounded-lg bg-accent px-4 h-9 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors flex-1"
          >
            Reassign
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-line-strong px-4 h-9 text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
          >
            Cancel
          </button>
        </>
      )}

      {task.status === "progress" && (
        <>
          <button
            onClick={onCancel}
            className="rounded-lg border border-line-strong bg-transparent px-4 h-9 text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onMarkBlocked}
            className="rounded-lg border border-line-strong bg-transparent px-4 h-9 text-sm font-medium text-foreground hover:bg-surface-strong transition-colors"
          >
            Mark Blocked
          </button>
          <button
            onClick={onMarkDone}
            className="rounded-lg bg-accent px-4 h-9 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors flex-1"
          >
            Mark Done
          </button>
        </>
      )}

      {task.status === "review" && (
        <>
          <button
            onClick={onReassign}
            className="rounded-lg border border-line-strong bg-transparent px-4 h-9 text-sm font-medium text-foreground hover:bg-surface-strong transition-colors"
          >
            Reassign
          </button>
          <button
            onClick={onMarkDone}
            className="rounded-lg bg-accent px-4 h-9 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors flex-1"
          >
            Approve
          </button>
        </>
      )}

      {(task.status === "backlog" || task.status === "paused") && (
        <>
          <button
            onClick={onCancel}
            className="rounded-lg border border-line-strong bg-transparent px-4 h-9 text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
          >
            Cancel Task
          </button>
          {task.assignedAgentId && (
            <button
              onClick={onReassign}
              className="rounded-lg border border-line-strong bg-transparent px-4 h-9 text-sm font-medium text-foreground hover:bg-surface-strong transition-colors flex-1"
            >
              Reassign
            </button>
          )}
        </>
      )}

      {task.status === "done" && (
        <button
          onClick={onReassign}
          className="rounded-lg border border-line-strong bg-transparent px-4 h-9 text-sm font-medium text-foreground hover:bg-surface-strong transition-colors"
        >
          Reopen & Reassign
        </button>
      )}
    </div>
  );
}
