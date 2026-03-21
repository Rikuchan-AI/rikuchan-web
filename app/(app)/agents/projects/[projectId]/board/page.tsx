"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";

import { useProjectsStore, useProjectTasks, selectProjectById } from "@/lib/mc/projects-store";
import { TASK_COLUMNS } from "@/lib/mc/types-project";
import type { Task, TaskPriority, TaskStatus } from "@/lib/mc/types-project";
import { canTransition, type OperationMode } from "@/lib/mc/pipeline-governance";

import { TaskCard } from "@/components/mc/projects/TaskCard";
import { TaskDrawer } from "@/components/mc/projects/board/TaskDrawer";
import { BoardHeader } from "@/components/mc/projects/board/BoardHeader";
import { AgentRosterPanel } from "@/components/mc/projects/board/AgentRosterPanel";
import { EMChatSheet } from "@/components/mc/projects/chat/EMChatSheet";

// ─── New Task Form ───────────────────────────────────────────────────────────

function NewTaskForm({
  projectId,
  defaultStatus,
  onClose,
}: {
  projectId: string;
  defaultStatus?: TaskStatus;
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
      status: defaultStatus ?? "backlog",
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
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) handleSubmit();
          if (e.key === "Escape") onClose();
        }}
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
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-deep disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Board Page ──────────────────────────────────────────────────────────────

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore(selectProjectById(projectId));
  const tasks = useProjectTasks(projectId);
  const moveTask = useProjectsStore((s) => s.moveTask);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showEMChat, setShowEMChat] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<TaskStatus | undefined>();
  const [operationMode, setOperationMode] = useState<OperationMode>("supervised");
  const [search, setSearch] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);

  const leadAgent = project?.roster.find((m) => m.role === "lead");
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (blockedOnly && t.status !== "blocked") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, blockedOnly]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;

      const task = tasks.find((t) => t.id === draggableId);
      if (!task) return;

      const toStatus = destination.droppableId as TaskStatus;
      if (task.status === toStatus) return;

      const transitionResult = canTransition(task.status, toStatus, operationMode, "human", task);
      if (!transitionResult.allowed) {
        // TODO: replace with toast
        console.warn("[Board] Transition denied:", transitionResult.reason);
        return;
      }

      await moveTask(projectId, draggableId, toStatus);
    },
    [tasks, operationMode, moveTask, projectId],
  );

  const handleNewTaskInColumn = (status: TaskStatus) => {
    setNewTaskColumn(status);
    setShowNewTask(true);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-foreground-muted">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <BoardHeader
        project={project}
        leadAgentName={leadAgent?.agentName}
        leadAgentOnline={true}
        operationMode={operationMode}
        onModeChange={setOperationMode}
        onNewTask={() => { setNewTaskColumn(undefined); setShowNewTask(true); }}
        onEMChat={() => setShowEMChat(true)}
        search={search}
        onSearchChange={setSearch}
        blockedOnly={blockedOnly}
        onBlockedOnlyChange={setBlockedOnly}
      />

      {/* New task form */}
      {showNewTask && !newTaskColumn && (
        <div className="mt-3">
          <NewTaskForm projectId={projectId} onClose={() => setShowNewTask(false)} />
        </div>
      )}

      {/* 3-panel layout */}
      <div className="mt-4 flex flex-1 gap-3 overflow-hidden">
        {/* Left: Agent Roster */}
        <div className="hidden w-56 shrink-0 overflow-y-auto rounded-lg border border-line bg-surface lg:block">
          <AgentRosterPanel
            roster={project.roster}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              assignedAgentId: t.assignedAgentId,
              status: t.status,
            }))}
            onSelectTask={setSelectedTaskId}
          />
        </div>

        {/* Center: Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid h-full auto-cols-fr grid-flow-col gap-3" style={{ minWidth: "900px" }}>
              {TASK_COLUMNS.map((col) => {
                const columnTasks = filteredTasks.filter((t) => t.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col">
                    {/* Column header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="mono text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                          {col.label}
                        </h3>
                        <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[9px] font-medium text-foreground-muted">
                          {columnTasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => handleNewTaskInColumn(col.id)}
                        className="flex h-5 w-5 items-center justify-center rounded text-foreground-muted/40 hover:bg-surface-strong hover:text-foreground-muted transition-colors"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* In-column new task */}
                    {showNewTask && newTaskColumn === col.id && (
                      <div className="mb-2">
                        <NewTaskForm
                          projectId={projectId}
                          defaultStatus={col.id}
                          onClose={() => setShowNewTask(false)}
                        />
                      </div>
                    )}

                    {/* Droppable column */}
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-2 overflow-y-auto rounded-lg p-1.5 transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-accent/5 ring-1 ring-accent/20"
                              : ""
                          }`}
                          style={{ minHeight: "100px" }}
                        >
                          {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line">
                              <p className="text-[10px] text-foreground-muted">No tasks</p>
                            </div>
                          ) : (
                            columnTasks.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <TaskCard
                                      task={task}
                                      isDragging={dragSnapshot.isDragging}
                                      onClick={() => setSelectedTaskId(task.id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* Right: Task Drawer */}
        {selectedTask && (
          <div className="hidden w-[440px] shrink-0 overflow-y-auto rounded-lg border border-line bg-surface lg:block">
            <TaskDrawer
              task={selectedTask}
              projectId={projectId}
              onClose={() => setSelectedTaskId(null)}
            />
          </div>
        )}
      </div>

      {/* EM Chat overlay */}
      {showEMChat && project && (
        <EMChatSheet projectId={projectId} onClose={() => setShowEMChat(false)} />
      )}
    </div>
  );
}
