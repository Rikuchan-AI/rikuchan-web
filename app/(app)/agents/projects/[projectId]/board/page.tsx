"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";

import { useProjectsStore, useProjectTasks, selectProjectById } from "@/lib/mc/projects-store";
import { RikuPageLoader } from "@/components/shared/riku-loader";
import { useGatewayStore } from "@/lib/mc/gateway-store";
// project-activation removed — lifecycle managed by backend via projects-store
import { TASK_COLUMNS } from "@/lib/mc/types-project";
import type { Task, TaskPriority, TaskStatus } from "@/lib/mc/types-project";
import { canTransition, type OperationMode } from "@/lib/mc/pipeline-governance";

import { TaskCard } from "@/components/mc/projects/TaskCard";
import { TaskDrawer } from "@/components/mc/projects/board/TaskDrawer";
import { BoardHeader } from "@/components/mc/projects/board/BoardHeader";
import { AgentRosterPanel } from "@/components/mc/projects/board/AgentRosterPanel";
import { CreateTaskModal } from "@/components/mc/projects/board/CreateTaskModal";
import { EMChatSheet } from "@/components/mc/projects/chat/EMChatSheet";
import { TeamChat } from "@/components/mc/projects/board/TeamChat";
import { ActivityStream } from "@/components/mc/projects/board/ActivityStream";
import { AgentHealthPanel } from "@/components/mc/projects/board/AgentHealthPanel";
import { ApprovalQueue } from "@/components/mc/projects/board/ApprovalQueue";
import { SprintPlanning } from "@/components/mc/projects/board/SprintPlanning";

const COLUMN_COLORS: Record<string, string> = {
  backlog: "border-t-zinc-500",
  progress: "border-t-amber-400",
  review: "border-t-blue-400",
  blocked: "border-t-red-400",
  done: "border-t-emerald-400",
};

const COLUMN_TEXT_COLORS: Record<string, string> = {
  backlog: "text-zinc-500",
  progress: "text-amber-400",
  review: "text-blue-400",
  blocked: "text-red-400",
  done: "text-emerald-400",
};

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
      id: crypto.randomUUID(),
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
      <div className="flex items-center gap-1">
        {(["low", "medium", "high", "critical"] as TaskPriority[]).map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
              priority === p
                ? "bg-accent-soft text-accent border border-accent/15"
                : "text-foreground-muted hover:text-foreground hover:bg-surface-strong border border-transparent"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
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
  );
}

// ─── Board Page ──────────────────────────────────────────────────────────────

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore(selectProjectById(projectId));
  const hydrated = useProjectsStore((s) => s._hydrated);
  const tasks = useProjectTasks(projectId);
  const moveTask = useProjectsStore((s) => s.moveTask);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showEMChat, setShowEMChat] = useState(false);
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<TaskStatus | undefined>();
  const [operationMode, setOperationMode] = useState<OperationMode>("supervised");
  const [search, setSearch] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showSprintPlanning, setShowSprintPlanning] = useState(false);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const leadAgent = project?.roster.find((m) => m.role === "lead");
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const router = useRouter();
  const gwAgents = useGatewayStore((s) => s.agents);
  const gwConnected = useGatewayStore((s) => s.status === "connected");
  const gwStatus = useGatewayStore((s) => s.status);
  const gwConfig = useGatewayStore((s) => s.config);
  const gwConnect = useGatewayStore((s) => s.connect);
  const gwConnectedAt = useGatewayStore((s) => s.connectedAt);
  const expectedRestartReason = useGatewayStore((s) => s.expectedRestartReason);
  const agentsLoaded = useGatewayStore((s) => s.agentsLoaded);
  const configHydrated = useGatewayStore((s) => s._configHydrated);
  // Use gatewayAgentId (persisted after activation) for accurate gateway lookup
  const leadGwId = leadAgent?.gatewayAgentId ?? leadAgent?.agentId;
  const leadGwAgent = gwAgents.find((a) =>
    a.id === leadGwId ||
    (leadGwId && (a.id.includes(leadGwId) || leadGwId.includes(a.id)))
  );
  // Only evaluate online status after agents have been loaded from gateway
  const leadAgentOnline = agentsLoaded && (leadGwAgent?.status === "online" || leadGwAgent?.status === "idle" || leadGwAgent?.status === "thinking");

  const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "n":
          setShowCreateModal(true);
          break;
        case "f":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "Escape":
          if (selectedTaskId) setSelectedTaskId(null);
          else if (showEMChat) setShowEMChat(false);
          else if (showTeamChat) setShowTeamChat(false);
          else if (showHealth) setShowHealth(false);
          else if (showApprovals) setShowApprovals(false);
          else if (showSprintPlanning) setShowSprintPlanning(false);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTaskId, showEMChat, showTeamChat, showHealth, showApprovals, showSprintPlanning]);

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
    if (!gwConnected) return;
    setNewTaskColumn(status);
    setShowNewTask(true);
  };

  const handleActivate = async () => {
    if (!project || lifecycleLoading) return;
    setLifecycleLoading(true);
    try {
      await useProjectsStore.getState().activateProject(project.id);
    } catch (err) {
      console.error("[Board] Activation failed:", err);
    }
    setLifecycleLoading(false);
  };

  const handlePause = async () => {
    if (!project || lifecycleLoading) return;
    setLifecycleLoading(true);
    try {
      await useProjectsStore.getState().pauseProject(project.id);
    } catch (err) {
      console.error("[Board] Pause failed:", err);
    }
    setLifecycleLoading(false);
  };

  const handleResume = async () => {
    if (!project || lifecycleLoading) return;
    setLifecycleLoading(true);
    try {
      await useProjectsStore.getState().resumeProject(project.id);
    } catch (err) {
      console.error("[Board] Resume failed:", err);
    }
    setLifecycleLoading(false);
  };

  if (!hydrated) {
    return <RikuPageLoader message="LOADING BOARD..." />;
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-foreground-muted">Project not found</p>
      </div>
    );
  }

  // Banner state: only show after gateway status has been checked (not during initial boot)
  const showGatewayBanner = configHydrated && gwStatus !== "connected";
  const gatewayBannerIsExpected = expectedRestartReason === "config-patch";

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Gateway reconnect / applying config banner */}
      {showGatewayBanner && (
        <div className={`mb-3 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
          gatewayBannerIsExpected
            ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
            : "border-red-500/20 bg-red-500/5 text-red-400"
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 shrink-0 rounded-full animate-pulse ${
              gatewayBannerIsExpected ? "bg-amber-400" : "bg-red-400"
            }`} />
            <span className="font-medium">
              {gatewayBannerIsExpected
                ? "Applying configurations, gateway restarting..."
                : gwStatus === "connecting"
                  ? gwConnectedAt ? "Reconnecting to gateway..." : "Connecting to gateway..."
                  : "Gateway offline, task creation disabled"}
            </span>
          </div>
          {gwStatus === "disconnected" && !gatewayBannerIsExpected && (
            <button
              onClick={() => {
                if (gwConfig.url && gwConfig.token) {
                  gwConnect();
                } else {
                  router.push("/agents/gateway");
                }
              }}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <BoardHeader
        project={project}
        leadAgentName={leadAgent?.agentName}
        leadAgentOnline={leadAgentOnline}
        agentsLoaded={agentsLoaded}
        operationMode={operationMode}
        onModeChange={setOperationMode}
        onNewTask={gwConnected ? () => setShowCreateModal(true) : undefined}
        onEMChat={() => setShowEMChat(true)}
        onTeamChat={() => setShowTeamChat(true)}
        onHealth={() => setShowHealth(true)}
        onApprovals={() => setShowApprovals(true)}
        onSprintPlanning={() => setShowSprintPlanning(true)}
        onActivate={project.status !== "active" ? handleActivate : undefined}
        onPause={project.status === "active" ? handlePause : undefined}
        onResume={project.status === "paused" ? handleResume : undefined}
        lifecycleLoading={lifecycleLoading}
        search={search}
        onSearchChange={setSearch}
        blockedOnly={blockedOnly}
        onBlockedOnlyChange={setBlockedOnly}
        searchInputRef={searchInputRef}
      />

      {/* Create Task Modal (from header button) */}
      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          roster={project.roster}
          onClose={() => setShowCreateModal(false)}
        />
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
              subagentSessionKey: t.subagentSessionKey,
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
                  <div key={col.id} className={`flex min-h-0 flex-col border-t-2 ${COLUMN_COLORS[col.id] ?? "border-t-zinc-600"} rounded-t-lg`}>
                    {/* Column header */}
                    <div className="mb-3 flex items-center justify-between pt-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`mono text-[10px] font-semibold uppercase tracking-wider ${COLUMN_TEXT_COLORS[col.id] ?? "text-foreground-muted"}`}>
                          {col.label}
                        </h3>
                        <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[9px] font-medium text-foreground-muted">
                          {columnTasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => handleNewTaskInColumn(col.id)}
                        disabled={!gwConnected}
                        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${gwConnected ? "text-foreground-muted hover:bg-surface-strong hover:text-foreground" : "text-foreground-muted/15 cursor-not-allowed"}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* In-column new task */}
                    {showNewTask && newTaskColumn === col.id && (
                      <div className="mb-2 px-1.5">
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
                                    className={
                                      task.status !== "done" && task.updatedAt < Date.now() - STALE_THRESHOLD
                                        ? "rounded-lg ring-1 ring-amber-400/30"
                                        : undefined
                                    }
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

      </div>

      {/* Task Drawer — overlay, does not affect board layout */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Activity Stream */}
      <ActivityStream
        projectId={projectId}
        tasks={tasks}
        isCollapsed={activityCollapsed}
        onToggle={() => setActivityCollapsed((v) => !v)}
      />

      {/* EM Chat overlay */}
      {showEMChat && project && (
        <EMChatSheet projectId={projectId} onClose={() => setShowEMChat(false)} />
      )}

      {/* Team Chat overlay */}
      {showTeamChat && (
        <TeamChat projectId={projectId} onClose={() => setShowTeamChat(false)} />
      )}

      {/* Agent Health overlay */}
      {showHealth && project && (
        <AgentHealthPanel
          roster={project.roster}
          tasks={tasks}
          onClose={() => setShowHealth(false)}
        />
      )}

      {/* Approval Queue overlay */}
      {showApprovals && (
        <ApprovalQueue
          tasks={tasks}
          operationMode={operationMode}
          onApprove={async (taskId) => {
            await moveTask(projectId, taskId, "done");
            setShowApprovals(false);
          }}
          onReject={async (taskId) => {
            await moveTask(projectId, taskId, "progress");
          }}
          onClose={() => setShowApprovals(false)}
        />
      )}

      {/* Sprint Planning overlay */}
      {showSprintPlanning && project && (
        <SprintPlanning
          projectId={projectId}
          tasks={tasks}
          roster={project.roster}
          onCreateSprint={() => {
            // Sprint data will be persisted when Supabase sprint table is ready
            setShowSprintPlanning(false);
          }}
          onClose={() => setShowSprintPlanning(false)}
        />
      )}
    </div>
  );
}
