"use client";

import type { RefObject } from "react";
import { Crown, Plus, Search, Filter, MessageSquare, Heart, Shield, Calendar, Play, Pause, Loader2 } from "lucide-react";
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
  onTeamChat: () => void;
  onHealth: () => void;
  onApprovals: () => void;
  onSprintPlanning: () => void;
  onActivate?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  lifecycleLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  blockedOnly: boolean;
  onBlockedOnlyChange: (value: boolean) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

const MODE_CONFIG: Record<OperationMode, { label: string; color: string; activeColor: string; tooltip: string }> = {
  manual: { label: "Manual", color: "text-red-400", activeColor: "bg-red-400/15 text-red-400 border-red-400/30", tooltip: "Every action requires human approval" },
  supervised: { label: "Supervised", color: "text-amber-400", activeColor: "bg-amber-400/15 text-amber-400 border-amber-400/30", tooltip: "Agents execute, human reviews transitions" },
  autonomous: { label: "Autonomous", color: "text-emerald-400", activeColor: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30", tooltip: "Lead agent delegates without approval" },
};

export function BoardHeader({
  project,
  leadAgentName,
  leadAgentOnline,
  operationMode,
  onModeChange,
  onNewTask,
  onEMChat,
  onTeamChat,
  onHealth,
  onApprovals,
  onSprintPlanning,
  onActivate,
  onPause,
  onResume,
  lifecycleLoading,
  search,
  onSearchChange,
  blockedOnly,
  onBlockedOnlyChange,
  searchInputRef,
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

      {/* Lifecycle controls */}
      {project.status !== "active" && project.status !== "paused" && onActivate && (
        <button
          onClick={onActivate}
          disabled={lifecycleLoading}
          title="Activate project — start the board lead session"
          className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
        >
          {lifecycleLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Activate
        </button>
      )}
      {project.status === "active" && onPause && (
        <button
          onClick={onPause}
          disabled={lifecycleLoading}
          title="Pause project — lead saves state and goes idle"
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-foreground-soft transition-colors hover:border-amber-400/30 hover:text-amber-400 disabled:opacity-50"
        >
          {lifecycleLoading ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
          Pause
        </button>
      )}
      {project.status === "paused" && onResume && (
        <button
          onClick={onResume}
          disabled={lifecycleLoading}
          title="Resume project — lead wakes up from WORKING.md"
          className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
        >
          {lifecycleLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Resume
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
              title={config.tooltip}
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
          ref={searchInputRef}
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

      <div className="h-5 w-px bg-line" />

      {/* Right-side action buttons */}
      <button
        onClick={onTeamChat}
        className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-foreground-soft transition-colors hover:border-accent/30 hover:text-foreground"
        title="Team Chat"
      >
        <MessageSquare size={12} className="text-accent" />
        <span className="hidden xl:inline">Team Chat</span>
      </button>
      <button
        onClick={onHealth}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-foreground-soft transition-colors hover:border-accent/30 hover:text-foreground"
        title="Agent Health"
      >
        <Heart size={14} />
      </button>
      <button
        onClick={onApprovals}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-foreground-soft transition-colors hover:border-accent/30 hover:text-foreground"
        title="Approval Queue"
      >
        <Shield size={14} />
      </button>
      <button
        onClick={onSprintPlanning}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-foreground-soft transition-colors hover:border-accent/30 hover:text-foreground"
        title="Sprint Planning"
      >
        <Calendar size={14} />
      </button>
    </div>
  );
}
