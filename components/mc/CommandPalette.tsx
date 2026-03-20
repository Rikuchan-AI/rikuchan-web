"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Bot, FolderKanban, Zap, Settings, LayoutDashboard, MessageSquare } from "lucide-react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { useProjectsStore } from "@/lib/mc/projects-store";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const agents = useGatewayStore((s) => s.agents);
  const projects = useProjectsStore((s) => s.projects);
  const allTasks = useProjectsStore((s) => s.tasks);

  const items = useMemo<CommandItem[]>(() => {
    const cmds: CommandItem[] = [];

    // Navigation
    cmds.push({ id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, action: () => { router.push("/dashboard"); onClose(); }, category: "Navigation" });
    cmds.push({ id: "nav-agents", label: "Agents", icon: Bot, action: () => { router.push("/agents"); onClose(); }, category: "Navigation" });
    cmds.push({ id: "nav-sessions", label: "Sessions", icon: MessageSquare, action: () => { router.push("/sessions"); onClose(); }, category: "Navigation" });
    cmds.push({ id: "nav-gateway", label: "Gateway", icon: Zap, action: () => { router.push("/gateway"); onClose(); }, category: "Navigation" });
    cmds.push({ id: "nav-settings", label: "Settings", icon: Settings, action: () => { router.push("/settings"); onClose(); }, category: "Navigation" });
    cmds.push({ id: "nav-projects", label: "Projects", icon: FolderKanban, action: () => { router.push("/projects"); onClose(); }, category: "Navigation" });

    // Projects
    for (const project of projects) {
      cmds.push({
        id: `project-${project.id}`,
        label: project.name,
        description: project.workspacePath,
        icon: FolderKanban,
        action: () => { router.push(`/projects/${project.id}`); onClose(); },
        category: "Projects",
      });
    }

    // Agents
    for (const agent of agents.slice(0, 20)) {
      cmds.push({
        id: `agent-${agent.id}`,
        label: agent.name,
        description: `${agent.status} · ${agent.role}`,
        icon: Bot,
        action: () => { router.push(`/agents/${agent.id}`); onClose(); },
        category: "Agents",
      });
    }

    // Tasks (from all projects)
    for (const [projectId, tasks] of Object.entries(allTasks)) {
      const project = projects.find((p) => p.id === projectId);
      for (const task of (tasks as Array<{ id: string; title: string; status: string }>).slice(0, 10)) {
        cmds.push({
          id: `task-${task.id}`,
          label: task.title,
          description: `${task.status} · ${project?.name ?? ""}`,
          icon: FileText,
          action: () => { router.push(`/projects/${projectId}/board?taskId=${task.id}`); onClose(); },
          category: "Tasks",
        });
      }
    }

    return cmds;
  }, [agents, projects, allTasks, router, onClose]);

  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 15);
    const q = query.toLowerCase();
    return items.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [items, query]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[selectedIndex]) { e.preventDefault(); filtered[selectedIndex].action(); }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIndex, onClose]);

  if (!open) return null;

  // Group by category
  const grouped = new Map<string, CommandItem[]>();
  for (const item of filtered) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category)!.push(item);
  }

  let globalIndex = 0;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[61] w-[560px] max-w-[90vw] rounded-xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Search size={16} className="text-foreground-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search tasks, agents, projects..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
          />
          <kbd className="rounded bg-surface-strong border border-line px-1.5 py-0.5 text-[10px] text-foreground-muted font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-foreground-muted text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            Array.from(grouped.entries()).map(([category, categoryItems]) => (
              <div key={category}>
                <p className="px-4 pt-2 pb-1 mono text-[10px] uppercase text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
                  {category}
                </p>
                {categoryItems.map((item) => {
                  const idx = globalIndex++;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${
                        selectedIndex === idx ? "bg-accent-soft" : "hover:bg-surface-strong"
                      }`}
                    >
                      <Icon size={14} className={selectedIndex === idx ? "text-accent" : "text-foreground-muted"} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${selectedIndex === idx ? "text-accent font-medium" : "text-foreground"}`}>
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="ml-2 text-xs text-foreground-muted truncate">{item.description}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-line bg-surface-muted">
          <span className="flex items-center gap-1 text-[10px] text-foreground-muted">
            <kbd className="rounded bg-surface-strong border border-line px-1 py-0.5 font-mono">&uarr;&darr;</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-foreground-muted">
            <kbd className="rounded bg-surface-strong border border-line px-1 py-0.5 font-mono">&crarr;</kbd> open
          </span>
        </div>
      </div>
    </>
  );
}
