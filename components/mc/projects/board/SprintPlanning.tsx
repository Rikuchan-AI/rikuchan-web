"use client";

import { useEffect } from "react";
import { X, Calendar } from "lucide-react";

interface SprintPlanningProps {
  projectId: string;
  onClose: () => void;
}

const STEPS = [
  { number: 1, label: "Define" },
  { number: 2, label: "Select Tasks" },
  { number: 3, label: "Review" },
];

export function SprintPlanning({ projectId, onClose }: SprintPlanningProps) {
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
        aria-label="Sprint Planning"
        className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
              <Calendar size={14} className="text-accent" />
            </div>
            <p className="text-sm font-semibold text-foreground">Sprint Planning</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                      i === 0
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-strong text-foreground-muted"
                    }`}
                  >
                    {step.number}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      i === 0 ? "text-foreground" : "text-foreground-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-px w-6 bg-line" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body — placeholder */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-strong">
              <Calendar size={20} className="text-foreground-muted" />
            </div>
            <p className="text-sm font-medium text-foreground">Sprint planning coming soon</p>
            <p className="text-xs text-foreground-muted/60 max-w-[280px] leading-relaxed">
              Define sprints, assign tasks, track velocity. This feature will be available when the Sprint table is created in Supabase.
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
