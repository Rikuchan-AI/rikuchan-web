"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useProjectsStore, useProjectTasks } from "@/lib/mc/projects-store";
import { TASK_COLUMNS } from "@/lib/mc/types-project";
import { TaskCard } from "@/components/mc/projects/TaskCard";
import type { Task, TaskPriority } from "@/lib/mc/types-project";

function NewTaskForm({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const createTask = useProjectsStore((s) => s.createTask);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const now = Date.now();
    const task: Task = {
      id: `task-${now}-${Math.random().toString(16).slice(2, 6)}`,
      projectId,
      title: title.trim(),
      description: description.trim(),
      status: "backlog",
      priority,
      assignedAgentId: null,
      createdBy: "user",
      subtasks: [],
      tags: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    await createTask(projectId, task);
    setSaving(false);
    onClose();
  };

  return (
    <div className="rounded-xl border border-accent/20 bg-surface p-4 space-y-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
        onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleSubmit(); if (e.key === "Escape") onClose(); }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(["low", "medium", "high", "critical"] as TaskPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                priority === p
                  ? "bg-accent-soft text-accent border border-accent/15"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-strong border border-transparent"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-deep disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const tasks = useProjectTasks(projectId);
  const [showNewTask, setShowNewTask] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-xs text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
          {tasks.length} TASKS
        </p>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
        >
          <Plus size={12} />
          New Task
        </button>
      </div>

      {showNewTask && (
        <NewTaskForm projectId={projectId} onClose={() => setShowNewTask(false)} />
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {TASK_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center justify-between">
                <h3
                  className="mono text-xs uppercase text-foreground-muted font-semibold"
                  style={{ letterSpacing: "0.12em" }}
                >
                  {col.label}
                </h3>
                <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted font-medium">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2 min-h-[100px]">
                {columnTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line p-4 text-center">
                    <p className="text-xs text-foreground-muted">No tasks</p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
