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
import { useGatewayStore } from "./gateway-store";
import { getStorageAdapter } from "./storage";

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

  // Gateway integration
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

  // ─── Hydration from storage adapter ─────────────────────────────────

  hydrate: async () => {
    if (get()._hydrated) return;
    const adapter = getStorageAdapter();
    const groups = await adapter.listGroups();
    const projects = await adapter.listProjects();
    set({ groups, projects, _hydrated: true });
  },

  hydrateProject: async (projectId: string) => {
    const adapter = getStorageAdapter();
    const [tasks, pipelines, docs, triggers] = await Promise.all([
      adapter.listTasks(projectId),
      adapter.listPipelines(projectId),
      adapter.listMemoryDocs(projectId),
      adapter.listTriggers(projectId),
    ]);
    set((s) => ({
      tasks: { ...s.tasks, [projectId]: tasks },
      pipelines: { ...s.pipelines, [projectId]: pipelines },
      memoryDocs: { ...s.memoryDocs, [projectId]: docs },
      triggers: { ...s.triggers, [projectId]: triggers },
    }));
  },

  // ─── Groups ────────────────────────────────────────────────────────

  createGroup: async (group) => {
    set((s) => ({ groups: [group, ...s.groups] }));
    await getStorageAdapter().createGroup(group);
  },

  updateGroup: async (id, updates) => {
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g)),
    }));
    await getStorageAdapter().updateGroup(id, updates);
  },

  deleteGroup: async (id) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      projects: s.projects.map((p) => (
        p.groupId === id ? { ...p, groupId: undefined, updatedAt: Date.now() } : p
      )),
    }));
    await getStorageAdapter().deleteGroup(id);
  },

  // ─── Project CRUD ───────────────────────────────────────────────────

  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => set({ activeProjectId: id }),

  createProject: async (project) => {
    // Auto-generate workspace if empty
    if (!project.workspacePath) {
      const stateDir = useGatewayStore.getState().stateDir;
      const base = stateDir ?? "~/.openclaw";
      project = { ...project, workspacePath: `${base}/projects/${project.id}` };
    }

    set((s) => ({ projects: [project, ...s.projects] }));
    await getStorageAdapter().createProject(project);

    // Sync all roster agents to use the project workspace
    for (const member of project.roster) {
      syncAgentToGateway(member.agentId, { workspace: project.workspacePath });
    }
  },

  updateProject: async (id, updates) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)),
    }));
    await getStorageAdapter().updateProject(id, updates);
    get().sendProjectCommand({ type: "project_update", projectId: id, updates });
  },

  deleteProject: async (id) => {
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    await getStorageAdapter().deleteProject(id);
    get().sendProjectCommand({ type: "project_delete", projectId: id });
  },

  // ─── Tasks ──────────────────────────────────────────────────────────

  setTasks: (projectId, tasks) => {
    set((s) => ({ tasks: { ...s.tasks, [projectId]: tasks } }));
  },

  moveTask: async (projectId, taskId, newStatus) => {
    set((s) => {
      const tasks = (s.tasks[projectId] ?? []).map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t
      );
      return { tasks: { ...s.tasks, [projectId]: tasks } };
    });
    await getStorageAdapter().updateTask(projectId, taskId, { status: newStatus });
    get().sendProjectCommand({ type: "task_move", taskId, newStatus, projectId });
  },

  createTask: async (projectId, task) => {
    set((s) => ({
      tasks: { ...s.tasks, [projectId]: [task, ...(s.tasks[projectId] ?? [])] },
    }));
    try {
      const adapter = getStorageAdapter();
      console.log("[Projects] createTask using adapter:", adapter.constructor.name, "projectId:", projectId, "taskId:", task.id);
      await adapter.createTask(projectId, task);
      console.log("[Projects] Task persisted OK:", task.id);
    } catch (err) {
      console.error("[Projects] FAILED to persist task:", err instanceof Error ? err.message : err);
    }
    get().sendProjectCommand({ type: "task_create", projectId, task });

    // Auto-delegate: if project is active, not manual, and task is unassigned in backlog
    if (task.status === "backlog" && !task.assignedAgentId) {
      const project = get().projects.find((p) => p.id === projectId);
      if (project && project.status === "active" && project.operationMode !== "manual") {
        // Dynamic import to avoid circular dependency (em-delegation imports projects-store)
        import("./em-delegation").then(({ triggerEMDelegation }) => {
          triggerEMDelegation(task, project).catch((err) => {
            console.warn("[Projects] Auto-delegation failed:", err);
          });
        }).catch(() => { /* ignore import errors */ });
      }
    }
  },

  updateTask: async (projectId, taskId, updates) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
        ),
      },
    }));
    try {
      await getStorageAdapter().updateTask(projectId, taskId, updates);
    } catch (err) {
      console.error("[Projects] Failed to persist task update:", err);
    }
  },

  assignTask: async (projectId, taskId, agentId) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).map((t) =>
          t.id === taskId ? { ...t, assignedAgentId: agentId, updatedAt: Date.now() } : t
        ),
      },
    }));
    await getStorageAdapter().updateTask(projectId, taskId, { assignedAgentId: agentId });
    get().sendProjectCommand({ type: "task_assign", taskId, agentId, projectId });
  },

  deleteTask: async (projectId, taskId) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] ?? []).filter((t) => t.id !== taskId),
      },
    }));
    await getStorageAdapter().deleteTask(projectId, taskId);
  },

  // ─── Pipelines ──────────────────────────────────────────────────────

  setPipelines: (projectId, pipelines) => {
    set((s) => ({ pipelines: { ...s.pipelines, [projectId]: pipelines } }));
  },

  updatePipelineStep: (pipelineId, step) => {
    set((s) => ({
      activePipelineRun: {
        ...s.activePipelineRun,
        [pipelineId]: (s.activePipelineRun[pipelineId] ?? []).map((st) =>
          st.id === step.id ? step : st
        ),
      },
    }));
  },

  setPipelineStatus: (pipelineId, status) => {
    set((s) => {
      const updated: Record<string, Pipeline[]> = {};
      for (const [pid, pls] of Object.entries(s.pipelines)) {
        updated[pid] = pls.map((p) => (p.id === pipelineId ? { ...p, status } : p));
      }
      return { pipelines: updated };
    });
  },

  // ─── Memory ─────────────────────────────────────────────────────────

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
    await getStorageAdapter().addMemoryDoc(projectId, doc);
    get().sendProjectCommand({ type: "memory_add", projectId, doc });
  },

  updateMemoryDoc: async (projectId, docId, updates) => {
    set((s) => ({
      memoryDocs: {
        ...s.memoryDocs,
        [projectId]: (s.memoryDocs[projectId] ?? []).map((d) =>
          d.id === docId ? { ...d, ...updates } : d
        ),
      },
    }));
    await getStorageAdapter().updateMemoryDoc(projectId, docId, updates);
  },

  deleteMemoryDoc: async (projectId, docId) => {
    set((s) => ({
      memoryDocs: {
        ...s.memoryDocs,
        [projectId]: (s.memoryDocs[projectId] ?? []).filter((d) => d.id !== docId),
      },
    }));
    await getStorageAdapter().deleteMemoryDoc(projectId, docId);
  },

  // ─── Triggers ───────────────────────────────────────────────────────

  setTriggers: (projectId, triggers) => {
    set((s) => ({ triggers: { ...s.triggers, [projectId]: triggers } }));
  },

  toggleTrigger: async (projectId, triggerId, enabled) => {
    set((s) => ({
      triggers: {
        ...s.triggers,
        [projectId]: (s.triggers[projectId] ?? []).map((t) =>
          t.id === triggerId ? { ...t, enabled } : t
        ),
      },
    }));
    const trigger = get().triggers[projectId]?.find((t) => t.id === triggerId);
    if (trigger) await getStorageAdapter().saveTrigger(projectId, { ...trigger, enabled });
    get().sendProjectCommand({ type: "trigger_toggle", triggerId, enabled });
  },

  // ─── Gateway ────────────────────────────────────────────────────────

  sendProjectCommand: (_command) => {
    // No-op: OpenClaw gateway doesn't support project commands yet.
    // Project data is persisted via the storage adapter (localStorage/Supabase).
    // Agent-level config (spawn targets, heartbeat, model) is synced
    // via dedicated RPCs (agents.update, config.patch).
  },
}));

// ─── Gateway RPC helpers ────────────────────────────────────────────────────

/**
 * Sync agent config to OpenClaw gateway via agents.update RPC.
 * Supports: model, name, workspace.
 * Spawn targets are project-level config (not in gateway schema).
 */
export function syncAgentToGateway(
  agentId: string,
  updates: { model?: string; name?: string; workspace?: string },
) {
  const store = useGatewayStore.getState();
  if (store._ws?.readyState !== WebSocket.OPEN) return;

  const params: Record<string, string> = { agentId };
  if (updates.model) params.model = updates.model;
  if (updates.name) params.name = updates.name;
  if (updates.workspace) params.workspace = updates.workspace;

  // Only send if there's something besides agentId
  if (Object.keys(params).length <= 1) return;

  store.sendRpc("agents.update", params);
  console.log("[Projects] Synced agent to gateway:", agentId, params);
}

// ─── Scalar selectors (safe to use directly — return object or primitive) ───

export const selectProjectById = (id: string) => (s: ProjectsStore) =>
  s.projects.find((p) => p.id === id);

export const selectGroupById = (id?: string | null) => (s: ProjectsStore) =>
  id ? s.groups.find((g) => g.id === id) : undefined;

// ─── Array selectors (use these hooks to avoid infinite re-render loops) ────

export const selectProjectTasks = (projectId: string) => (s: ProjectsStore) =>
  s.tasks[projectId] ?? [];

export const selectProjectPipelines = (projectId: string) => (s: ProjectsStore) =>
  s.pipelines[projectId] ?? [];

export const selectProjectMemory = (projectId: string) => (s: ProjectsStore) =>
  s.memoryDocs[projectId] ?? [];

export const selectProjectTriggers = (projectId: string) => (s: ProjectsStore) =>
  s.triggers[projectId] ?? [];

export const selectActiveProjects = (s: ProjectsStore) =>
  s.projects.filter((p) => p.status === "active");

// ─── Safe hooks (wrap array selectors with useShallow) ──────────────────────

export const useProjectTasks = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectTasks(projectId)));

export const useProjectPipelines = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectPipelines(projectId)));

export const useProjectMemory = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectMemory(projectId)));

export const useProjectTriggers = (projectId: string) =>
  useProjectsStore(useShallow(selectProjectTriggers(projectId)));
