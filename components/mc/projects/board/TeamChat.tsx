"use client";

import { useEffect, useRef } from "react";
import { X, MessageSquare } from "lucide-react";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";

interface TeamChatProps {
  projectId: string;
  onClose: () => void;
}

export function TeamChat({ projectId, onClose }: TeamChatProps) {
  const project = useProjectsStore(selectProjectById(projectId));
  const bottomRef = useRef<HTMLDivElement>(null);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!project) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Team Chat"
        className="fixed right-0 top-0 bottom-0 z-50 w-[440px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
              <MessageSquare size={14} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Team Chat</p>
              <p className="text-xs text-foreground-muted">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages area — empty state */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-strong">
              <MessageSquare size={20} className="text-foreground-muted" />
            </div>
            <p className="text-sm text-foreground-muted max-w-[260px]">
              Project-wide chat for all agents and humans. Coming soon.
            </p>
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input — disabled placeholder */}
        <div className="border-t border-line p-4">
          <input
            disabled
            className="w-full rounded-lg border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground-muted placeholder:text-foreground-muted cursor-not-allowed opacity-60"
            placeholder="Team chat coming soon"
          />
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
