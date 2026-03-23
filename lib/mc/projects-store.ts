"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  BoardGroup,
  Project,
  Task,
  TaskStatus,
  Pipeline,
  PipelineStep,
  MemoryDocument,
  ProjectTrigger,
} from "./types-project";
import { getApiClient } from "./api-client";

interface ProjectsStore {
  groups: BoardGroup[];
  projects: Project[];
  activeProjectId: string | null;
  _hydrated: boolean;

  tasks: Record<string, Task[]>;
  pipelines: Record<string, Pipeline[]>;
  activePipelineRun: Record<string, PipelineStep[]>;
  memoryDocs: Record<string, MemoryDocument[]>;
  triggers: Record<string, ProjectTrigger[]>;

  // Hydration
  hydrate: () => Promise<void>;
  hydrateProject: (projectId: string) => Promise<void>;

  // Groups
  createGroup: (group: BoardGroup) => Promise<void>;
  updateGroup: (id: string, updates: Partial<BoardGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  // Project CRUD
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  createProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Tasks
  setTasks: (projectId: string, tasks: Task[]) => void;
  moveTask: (projectId: string, taskId: string, newStatus: TaskStatus) => Promise<void>;
  createTask: (projectId: string, task: Task) => Promise<void>;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  assignTask: (projectId: string, taskId: string, agentId: string | null) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;

  // Lifecycle (delegate to backend)
  activateProject: (id: string) => Promise<void>;
  pauseProject: (id: string) => Promise<void>;
  resumeProject: (id: string) => Promise<void>;
  completeProject: (id: string) => Promise<void>;
  delegateTask: (projectId: string, taskId: string) => Promise<void>;
  chatWithLead: (projectId: string, message: string) => Promise<void>;

  // Pipelines
  setPipelines: (projectId: string, pipelines: Pipeline[]) => void;
  updatePipelineStep: (pipelineId: string, step: PipelineStep) => void;
  setPipelineStatus: (pipelineId: string, status: Pipeline["status"]) => void;

  // Memory
  setMemoryDocs: (projectId: string, docs: MemoryDocument[]) => void;
  addMemoryDoc: (projectId: string, doc: MemoryDocument) => Promise<void>;
  updateMemoryDoc: (projectId: string, docId: string, updates: Partial<MemoryDocument>) => Promise<void>;
  deleteMemoryDoc: (projectId: string, docId: string) => Promise<void>;

  // Triggers
  setTriggers: (projectId: string, triggers: ProjectTrigger[]) => void;
  toggleTrigger: (projectId: string, triggerId: string, enabled: boolean) => Promise<void>;

  // Gateway integration (no-op — kept for compat)
  sendProjectCommand: (command: Record<string, unknown>) => void;
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  groups: [],
  projects: [],
  activeProjectId: null,
  _hydrated: false,
  tasks: {},
  pipelines: {},
  activePipelineRun: {},
  memoryDocs: {},
  triggers: {},

  // ─── Hydration from backend API ───────────────────────────────────

  hydrate: async () => {
    if (get()._hydrated) return;
    try {
      const api = getApiClient();
      const [groups, projects] = await Promise.all([
        api.groups.list(),
        api.projects.list(),
      ]);
      set({ groups, projects, _hydrated: true });
    } catch (err) {
      console.error("[projects] Hydration failed:", err);
      set({ _hydrated: true }); // Mark hydrated to avoid infinite retries
    }
  },

  hydrateProject: async (projectId: string) => {
    try {
      const api = getApiClient();
      const [tasks, memoryDocs] = await Promise.all([
        api.tasks.list(projectId),
        api.memoryDocs.list(projectId),
      ]);
      set((s) => ({
        tasks: { ...s.tasks, [projectId]: tasks },
        memoryDocs: { ...s.memoryDocs, [projectId]: memoryDocs },
      }));
    } catch (err) {
      console.error("[projects] Project hydration failed:", err);
    }
  },

  // ─── Groups ────────────────────────────────────────────────────────

  createGroup: async (group) => {
    set((s) => ({ groups: [group, ...s.groups] }));
    try {
      await getApiClient().groups.create(group);
    } catch (err) {
      console.error("[projects] Failed to create group:", err);
    }
  },

  updateGroup: async (id, updates) => {
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g,
      ),
    }));
    try {
      await getApiClient().groups.update(id, updates);
    } catch (err) {
      console.error("[projects] Failed to update group:", err);
    }
  },

  deleteGroup: async (id) => {
    // Cascade delete projects in group
    const groupProjects = get().projects.filter((p) => p.groupId === id);
    for (const p of groupProjects) {
      try {
        await get().deleteProject(p.id);
      } catch {
        // best-effort cascade
      }
    }

    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
    }));

    try {
      await getApiClient().groups.delete(id);
    } catch (err) {
      console.error("[projects] Failed to delete group:", err);
    }
  },

  // ─── Project CRUD ─────────────────────────────────────────────────

  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => set({ activeProjectId: id }),

  createProject: async (project) => {
    set((s) => ({ projects: [project, ...s.projects] }));
    try {
      const created = await getApiClient().projects.create(project);
      // If backend returned a different ID, update local state to match
      if (created && created.id !== project.id) {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === project.id ? { ...p, ...created } : p,
          ),
        }));
      }
    } catch (err) {
      console.error("[projects] Failed to create project:", err);
    }
  },

  updateProject: async (id, updates) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
      ),
    }));
    try {
      await getApiClient().projects.update(id, updates);
    } catch (err) {
      console.error("[projects] Failed to update project:", err);
    }
  },

  deleteProject: async (id) => {
    set((s) => {
      const { [id]: _, ...remainingTasks } = s.tasks;
      return {
        projects: s.projects.filter((p) => p.id !== id),
        tasks: remainingTasks,
      };
    });
    try {
      await getApiClient().projects.delete(id);
    } catch (err) {
      console.error("[projects] Failed to delete project:", err);
    }
  },

  // ─── Tasks ────────────────────────────────────────────────────────

  setTasks: (projectId, tasks) => {
    set((s) => ({ tasks: { ...s.tasks, [projectId]: tasks } }));
  },

  moveTask: async (projectId, taskId, newStatus) => {
    // Optimistic update
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, updatedAt: Date.now() }
            : t,
        ),
      },
    }));
    try {
      await getApiClient().tasks.move(projectId, taskId, {
        status: newStatus,
      });
    } catch (err) {
      console.error("[projects] Failed to move task:", err);
    }
  },

  createTask: async (projectId, task) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: [task, ...(s.tasks[projectId] ?? [])],
      },
    }));
    try {
      const created = await getApiClient().tasks.create(projectId, task);
      // If backend returned a different ID, update local state to match
      if (created && created.id !== task.id) {
        set((s) => ({
          tasks: {
            ...s.tasks,
            [projectId]: (s.tasks[projectId] ?? []).map((t) =>
              t.id === task.id ? { ...t, ...created } : t,
            ),
          },
        }));
      }
    } catch (err) {
      console.error("[projects] Failed to create task:", err);
    }
  },

  updateTask: async (projectId, taskId, updates) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t,
        ),
      },
    }));
    try {
      await getApiClient().tasks.update(projectId, taskId, updates);
    } catch (err) {
      const is404 = err instanceof Error && err.message.includes("404");
      if (!is404) {
        console.error("[projects] Failed to update task:", err);
      }
    }
  },

  assignTask: async (projectId, taskId, agentId) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).map((t) =>
          t.id === taskId
            ? { ...t, assignedAgentId: agentId, updatedAt: Date.now() }
            : t,
        ),
      },
    }));
    try {
      await getApiClient().tasks.update(projectId, taskId, {
        assignedAgentId: agentId,
      });
    } catch (err) {
      console.error("[projects] Failed to assign task:", err);
    }
  },

  deleteTask: async (projectId, taskId) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).filter(
          (t) => t.id !== taskId,
        ),
      },
    }));
    try {
      await getApiClient().tasks.delete(projectId, taskId);
    } catch (err) {
      console.error("[projects] Failed to delete task:", err);
    }
  },

  // ─── Lifecycle Actions (backend handles the orchestration) ────────

  activateProject: async (id) => {
    await getApiClient().projects.activate(id);
    // Update local state immediately (SSE gateway:status doesn't update project store)
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, status: "active" as const, updatedAt: Date.now() } : p,
      ),
    }));
  },

  pauseProject: async (id) => {
    await getApiClient().projects.pause(id);
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, status: "paused" as const, updatedAt: Date.now() } : p,
      ),
    }));
  },

  resumeProject: async (id) => {
    await getApiClient().projects.resume(id);
  },

  completeProject: async (id) => {
    await getApiClient().projects.complete(id);
  },

  delegateTask: async (projectId, taskId) => {
    await getApiClient().tasks.delegate(projectId, taskId);
    // SSE will send delegation:status update
  },

  chatWithLead: async (projectId, message) => {
    await getApiClient().projects.chat(projectId, message);
    // Response comes via SSE execution:log
  },

  // ─── Pipelines ────────────────────────────────────────────────────

  setPipelines: (projectId, pipelines) => {
    set((s) => ({ pipelines: { ...s.pipelines, [projectId]: pipelines } }));
  },

  updatePipelineStep: (pipelineId, step) => {
    set((s) => ({
      activePipelineRun: {
        ...s.activePipelineRun,
        [pipelineId]: (s.activePipelineRun[pipelineId] ?? []).map((st) =>
          st.id === step.id ? step : st,
        ),
      },
    }));
  },

  setPipelineStatus: (pipelineId, status) => {
    set((s) => {
      const updated: Record<string, Pipeline[]> = {};
      for (const [pid, pls] of Object.entries(s.pipelines)) {
        updated[pid] = pls.map((p) =>
          p.id === pipelineId ? { ...p, status } : p,
        );
      }
      return { pipelines: updated };
    });
  },

  // ─── Memory ───────────────────────────────────────────────────────

  setMemoryDocs: (projectId, docs) => {
    set((s) => ({ memoryDocs: { ...s.memoryDocs, [projectId]: docs } }));
  },

  addMemoryDoc: async (projectId, doc) => {
    set((s) => ({
      memoryDocs: {
        ...s.memoryDocs,
        [projectId]: [doc, ...(s.memoryDocs[projectId] ?? [])],
      },
    }));
    try {
      await getApiClient().memoryDocs.create(projectId, doc);
    } catch (err) {
      console.error("[projects] Failed to create memory doc:", err);
    }
  },

  updateMemoryDoc: async (projectId, docId, updates) => {
    set((s) => ({
      memoryDocs: {
        ...s.memoryDocs,
        [projectId]: (s.memoryDocs[projectId] ?? []).map((d) =>
          d.id === docId ? { ...d, ...updates } : d,
        ),
      },
    }));
    try {
      await getApiClient().memoryDocs.update(projectId, docId, updates);
    } catch (err) {
      console.error("[projects] Failed to update memory doc:", err);
    }
  },

  deleteMemoryDoc: async (projectId, docId) => {
    set((s) => ({
      memoryDocs: {
        ...s.memoryDocs,
        [projectId]: (s.memoryDocs[projectId] ?? []).filter(
          (d) => d.id !== docId,
        ),
      },
    }));
    try {
      await getApiClient().memoryDocs.delete(projectId, docId);
    } catch (err) {
      console.error("[projects] Failed to delete memory doc:", err);
    }
  },

  // ─── Triggers ─────────────────────────────────────────────────────

  setTriggers: (projectId, triggers) => {
    set((s) => ({ triggers: { ...s.triggers, [projectId]: triggers } }));
  },

  toggleTrigger: async (projectId, triggerId, enabled) => {
    set((s) => ({
      triggers: {
        ...s.triggers,
        [projectId]: (s.triggers[projectId] ?? []).map((t) =>
          t.id === triggerId ? { ...t, enabled } : t,
        ),
      },
    }));
  },

  // ─── Gateway (no-op) ──────────────────────────────────────────────

  sendProjectCommand: () => {
    // No-op: all project commands go through REST API now
  },
}));

// ─── Gateway RPC helpers (kept for compat — agent-files.ts uses this) ────────

export function syncAgentToGateway(
  _agentId: string,
  _updates: { model?: string; name?: string; workspace?: string },
) {
  // In the new architecture, agent syncing is handled by the backend
  // when projects are activated/updated. This is a no-op.
  console.warn(
    "[projects] syncAgentToGateway() is deprecated. Backend handles gateway sync.",
  );
}

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectProjectById = (id: string) => (s: ProjectsStore) =>
  s.projects.find((p) => p.id === id);

export const selectGroupById = (id?: string | null) => (s: ProjectsStore) =>
  id ? s.groups.find((g) => g.id === id) : undefined;

export const selectProjectTasks = (projectId: string) => (s: ProjectsStore) =>
  s.tasks[projectId] ?? [];

export const selectProjectPipelines =
  (projectId: string) => (s: ProjectsStore) =>
    s.pipelines[projectId] ?? [];

export const selectProjectMemory =
  (projectId: string) => (s: ProjectsStore) =>
    s.memoryDocs[projectId] ?? [];

export const selectProjectTriggers =
  (projectId: string) => (s: ProjectsStore) =>
    s.triggers[projectId] ?? [];

export const selectActiveProjects = (s: ProjectsStore) =>
  s.projects.filter((p) => p.status === "active");

// ─── Safe hooks ─────────────────────────────────────────────────────────────

export const useProjectTasks = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectTasks(projectId)));

export const useProjectPipelines = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectPipelines(projectId)));

export const useProjectMemory = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectMemory(projectId)));

export const useProjectTriggers = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectTriggers(projectId)));
