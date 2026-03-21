"use client";

import { Crown, Plus, Search, Filter } from "lucide-react";
import type { Project } from "@/lib/mc/types-project";
import type { OperationMode } from "@/lib/mc/pipeline-governance";

interface BoardHeaderProps {
  project: Project;
  leadAgentName?: string;
  leadAgentOnline?: boolean;
  operationMode: OperationMode;
  onModeChange: (mode: OperationMode) => void;
  onNewTask: () => void;
  onEMChat: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  blockedOnly: boolean;
  onBlockedOnlyChange: (value: boolean) => void;
}

const MODE_CONFIG: Record<OperationMode, { label: string; color: string; activeColor: string }> = {
  manual: { label: "Manual", color: "text-red-400", activeColor: "bg-red-400/15 text-red-400 border-red-400/30" },
  supervised: { label: "Supervised", color: "text-amber-400", activeColor: "bg-amber-400/15 text-amber-400 border-amber-400/30" },
  autonomous: { label: "Autonomous", color: "text-emerald-400", activeColor: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30" },
};

export function BoardHeader({
  project,
  leadAgentName,
  leadAgentOnline,
  operationMode,
  onModeChange,
  onNewTask,
  onEMChat,
  search,
  onSearchChange,
  blockedOnly,
  onBlockedOnlyChange,
}: BoardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line pb-4">
      {/* Project name */}
      <h1
        className="text-lg font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {project.name}
      </h1>

      {/* Lead agent badge */}
      {leadAgentName && (
        <button
          onClick={onEMChat}
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-foreground-soft transition-colors hover:border-accent/30 hover:text-foreground"
        >
          <Crown size={12} className="text-accent" />
          <span>{leadAgentName}</span>
          <span
            className={`h-2 w-2 rounded-full ${
              leadAgentOnline ? "bg-emerald-400 animate-pulse" : "bg-foreground-muted"
            }`}
          />
        </button>
      )}

      {/* Operation mode toggle */}
      <div className="flex items-center rounded-lg border border-line p-0.5">
        {(["manual", "supervised", "autonomous"] as OperationMode[]).map((mode) => {
          const config = MODE_CONFIG[mode];
          const active = operationMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                active ? config.activeColor + " border" : "text-foreground-muted hover:text-foreground border border-transparent"
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="w-44 rounded-md border border-line bg-surface-strong pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent/40 focus:outline-none transition-colors"
        />
      </div>

      {/* Blocked filter */}
      <button
        onClick={() => onBlockedOnlyChange(!blockedOnly)}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider border transition-colors ${
          blockedOnly
            ? "border-red-400/30 bg-red-400/10 text-red-400"
            : "border-line text-foreground-muted hover:text-foreground"
        }`}
      >
        <Filter size={10} />
        Blocked
      </button>

      {/* New task */}
      <button
        onClick={onNewTask}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
      >
        <Plus size={14} />
        New Task
      </button>
    </div>
  );
}
