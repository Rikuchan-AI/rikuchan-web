"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Plus, ChevronRight, Play, Check } from "lucide-react";
import type { Task, RosterMember } from "@/lib/mc/types-project";

interface SprintPlanningProps {
  projectId: string;
  tasks: Task[];
  roster: RosterMember[];
  onClose: () => void;
  onCreateSprint: (sprint: { name: string; goal: string; startDate: string; endDate: string; taskIds: string[] }) => void;
}

type Step = "define" | "select" | "review";

const STEPS: { id: Step; number: number; label: string }[] = [
  { id: "define", number: 1, label: "Define" },
  { id: "select", number: 2, label: "Select Tasks" },
  { id: "review", number: 3, label: "Review" },
];

export function SprintPlanning({ projectId, tasks, roster, onClose, onCreateSprint }: SprintPlanningProps) {
  const [step, setStep] = useState<Step>("define");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const backlogTasks = tasks.filter((t) => t.status === "backlog");
  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleCreate = () => {
    onCreateSprint({
      name: name.trim(),
      goal: goal.trim(),
      startDate,
      endDate,
      taskIds: Array.from(selectedTaskIds),
    });
    onClose();
  };

  // Agent capacity summary
  const agentLoad = roster.map((m) => ({
    name: m.agentName,
    role: m.role,
    assigned: tasks.filter((t) => t.assignedAgentId === m.agentId && t.status !== "done").length,
    selected: Array.from(selectedTaskIds).filter((id) => {
      const t = tasks.find((task) => task.id === id);
      return t?.assignedAgentId === m.agentId;
    }).length,
  }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Sprint Planning"
        className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-full bg-surface border-l border-line flex flex-col"
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
        <div className="px-5 py-3 border-b border-line">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => { if (i <= currentStepIndex) setStep(s.id); }}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                      i <= currentStepIndex
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-strong text-foreground-muted"
                    }`}
                  >
                    {i < currentStepIndex ? <Check size={10} /> : s.number}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      i <= currentStepIndex ? "text-foreground" : "text-foreground-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && <div className="h-px w-6 bg-line" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === "define" && (
            <>
              <div className="space-y-3">
                <div>
                  <label className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Sprint Name</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sprint 1"
                    className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Goal</label>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="What this sprint aims to achieve..."
                    rows={3}
                    className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mono text-[10px] uppercase tracking-wider text-foreground-muted">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "select" && (
            <>
              <p className="text-xs text-foreground-muted">
                Select tasks from backlog ({selectedTaskIds.size} selected of {backlogTasks.length})
              </p>
              {backlogTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-foreground-muted">No tasks in backlog</p>
                  <p className="text-xs text-foreground-muted/60 mt-1">Create tasks first, then plan a sprint.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {backlogTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedTaskIds.has(task.id)
                          ? "border-accent/40 bg-accent/5"
                          : "border-line bg-surface-muted hover:border-accent/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            selectedTaskIds.has(task.id)
                              ? "border-accent bg-accent"
                              : "border-foreground-muted/30"
                          }`}
                        >
                          {selectedTaskIds.has(task.id) && <Check size={10} className="text-accent-foreground" />}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 pl-6">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium capitalize ${
                          task.priority === "critical" ? "bg-red-400/10 text-red-400" :
                          task.priority === "high" ? "bg-amber-400/10 text-amber-400" :
                          task.priority === "medium" ? "bg-blue-400/10 text-blue-400" :
                          "bg-foreground-muted/10 text-foreground-muted"
                        }`}>
                          {task.priority}
                        </span>
                        {task.assignedAgentName && (
                          <span className="mono text-[9px] text-foreground-muted">{task.assignedAgentName}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Agent capacity */}
              {agentLoad.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Agent Capacity</p>
                  {agentLoad.map((a) => (
                    <div key={a.name} className="flex items-center gap-2">
                      <span className="text-xs text-foreground-soft w-24 truncate">{a.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-strong overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${Math.min(((a.assigned + a.selected) / 3) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="mono text-[9px] text-foreground-muted">{a.assigned + a.selected}/3</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === "review" && (
            <>
              <div className="rounded-lg border border-line bg-surface-muted p-4 space-y-3">
                <div>
                  <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Sprint</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{name || "Untitled"}</p>
                </div>
                {goal && (
                  <div>
                    <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Goal</p>
                    <p className="text-xs text-foreground-soft mt-1">{goal}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Start</p>
                    <p className="text-xs text-foreground-soft mt-1">{startDate}</p>
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted">End</p>
                    <p className="text-xs text-foreground-soft mt-1">{endDate}</p>
                  </div>
                </div>
                <div>
                  <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted">Tasks</p>
                  <p className="text-xs text-foreground-soft mt-1">{selectedTaskIds.size} tasks selected</p>
                </div>
              </div>

              {selectedTaskIds.size > 0 && (
                <div className="space-y-1">
                  {Array.from(selectedTaskIds).map((id) => {
                    const task = tasks.find((t) => t.id === id);
                    if (!task) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
                        <Check size={10} className="text-accent shrink-0" />
                        <span className="text-xs text-foreground truncate">{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-line p-4 flex items-center justify-between">
          {step !== "define" ? (
            <button
              onClick={() => setStep(step === "review" ? "select" : "define")}
              className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step === "review" ? (
            <button
              onClick={handleCreate}
              disabled={!name.trim() || selectedTaskIds.size === 0}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-deep disabled:opacity-50 transition-colors"
            >
              <Play size={14} />
              Start Sprint
            </button>
          ) : (
            <button
              onClick={() => setStep(step === "define" ? "select" : "review")}
              disabled={step === "define" && !name.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-deep disabled:opacity-50 transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          )}
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
