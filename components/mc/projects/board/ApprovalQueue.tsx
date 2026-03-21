"use client";

import { useEffect } from "react";
import { X, Shield } from "lucide-react";

interface ApprovalQueueProps {
  onClose: () => void;
}

export function ApprovalQueue({ onClose }: ApprovalQueueProps) {
  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Panel */}
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
            <p className="text-sm font-semibold text-foreground">Approval Queue</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Empty state */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-strong">
              <Shield size={20} className="text-foreground-muted" />
            </div>
            <p className="text-sm text-foreground-muted max-w-[260px]">
              No pending approvals
            </p>
            <p className="text-xs text-foreground-muted/60 max-w-[240px]">
              Approval workflows will appear here when agents request human review.
            </p>
          </div>
        </div>
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
