"use client";

import { useEffect } from "react";
import { X, Shield, Check, XCircle } from "lucide-react";
import type { Task } from "@/lib/mc/types-project";
import { canTransition, type OperationMode } from "@/lib/mc/pipeline-governance";

interface ApprovalQueueProps {
  tasks: Task[];
  operationMode: OperationMode;
  onApprove: (taskId: string) => void;
  onReject: (taskId: string) => void;
  onClose: () => void;
}

export function ApprovalQueue({ tasks, operationMode, onApprove, onReject, onClose }: ApprovalQueueProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Find tasks in review that require approval based on operation mode
  const pendingApprovals = tasks.filter((t) => {
    if (t.status !== "review") return false;
    const result = canTransition("review", "done", operationMode, "human");
    return result.allowed;
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Approval Queue"
        className="fixed right-0 top-0 bottom-0 z-50 w-[380px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
              <Shield size={14} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Approval Queue</p>
              <p className="text-xs text-foreground-muted">{pendingApprovals.length} pending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Approval list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-strong">
                <Shield size={20} className="text-foreground-muted" />
              </div>
              <p className="text-sm text-foreground-muted">No pending approvals</p>
              <p className="text-xs text-foreground-muted/60 max-w-[240px]">
                Tasks awaiting review will appear here for approval.
              </p>
            </div>
          ) : (
            pendingApprovals.map((task) => (
              <div key={task.id} className="rounded-lg border border-line bg-surface-muted p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{task.title}</p>
                  {task.description && (
                    <p className="mt-1 text-xs text-foreground-muted line-clamp-2">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-foreground-muted">
                  {task.assignedAgentName && (
                    <span className="mono">by {task.assignedAgentName}</span>
                  )}
                  <span>·</span>
                  <span className="rounded bg-blue-400/10 px-1.5 py-0.5 text-blue-400 font-medium">
                    In Review
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApprove(task.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Check size={12} />
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(task.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle size={12} />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bulk approve */}
        {pendingApprovals.length > 1 && (
          <div className="border-t border-line p-4">
            <button
              onClick={() => pendingApprovals.forEach((t) => onApprove(t.id))}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
            >
              <Check size={14} />
              Approve All ({pendingApprovals.length})
            </button>
          </div>
        )}
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
