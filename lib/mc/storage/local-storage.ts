import type { ProjectStorageAdapter } from "./adapter";
import type {
  BoardGroup,
  Project,
  Task,
  Pipeline,
  MemoryDocument,
  ProjectTrigger,
} from "../types-project";

const PREFIX = "rikuchan:projects";

function key(scope: string, id?: string) {
  return id ? `${PREFIX}:${scope}:${id}` : `${PREFIX}:${scope}`;
}

function readJSON<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(k: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(k, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Storage] Failed to write ${k}:`, e instanceof Error ? e.message : e);
  }
}

function removeKey(k: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(k);
}

export class LocalStorageAdapter implements ProjectStorageAdapter {
  // ─── Board Groups ──────────────────────────────────────────────────

  async listGroups(): Promise<BoardGroup[]> {
    return readJSON<BoardGroup[]>(key("groups"), []);
  }

  async createGroup(group: BoardGroup): Promise<BoardGroup> {
    const groups = await this.listGroups();
    groups.unshift(group);
    writeJSON(key("groups"), groups);
    return group;
  }

  async updateGroup(id: string, updates: Partial<BoardGroup>): Promise<BoardGroup> {
    const groups = await this.listGroups();
    const idx = groups.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Board group ${id} not found`);
    groups[idx] = { ...groups[idx], ...updates, updatedAt: Date.now() };
    writeJSON(key("groups"), groups);
    return groups[idx];
  }

  async deleteGroup(id: string): Promise<void> {
    const groups = await this.listGroups();
    writeJSON(key("groups"), groups.filter((g) => g.id !== id));

    const projects = await this.listProjects();
    const updatedProjects = projects.map((project) =>
      project.groupId === id
        ? { ...project, groupId: undefined, updatedAt: Date.now() }
        : project
    );
    writeJSON(key("list"), updatedProjects);
  }

  // ─── Projects ───────────────────────────────────────────────────────

  async listProjects(): Promise<Project[]> {
    return readJSON<Project[]>(key("list"), []);
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.listProjects();
    return projects.find((p) => p.id === id) ?? null;
  }

  async createProject(project: Project): Promise<Project> {
    const projects = await this.listProjects();
    projects.unshift(project);
    writeJSON(key("list"), projects);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const projects = await this.listProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project ${id} not found`);
    projects[idx] = { ...projects[idx], ...updates, updatedAt: Date.now() };
    writeJSON(key("list"), projects);
    return projects[idx];
  }

  async deleteProject(id: string): Promise<void> {
    const projects = await this.listProjects();
    writeJSON(key("list"), projects.filter((p) => p.id !== id));
    // Clean up related data
    removeKey(key("tasks", id));
    removeKey(key("pipelines", id));
    removeKey(key("memory", id));
    removeKey(key("triggers", id));
  }

  // ─── Tasks ──────────────────────────────────────────────────────────

  async listTasks(projectId: string): Promise<Task[]> {
    return readJSON<Task[]>(key("tasks", projectId), []);
  }

  async createTask(projectId: string, task: Task): Promise<Task> {
    const tasks = await this.listTasks(projectId);
    tasks.unshift(task);
    writeJSON(key("tasks", projectId), tasks);
    return task;
  }

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const tasks = await this.listTasks(projectId);
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error(`Task ${taskId} not found`);
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: Date.now() };
    writeJSON(key("tasks", projectId), tasks);
    return tasks[idx];
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    const tasks = await this.listTasks(projectId);
    writeJSON(key("tasks", projectId), tasks.filter((t) => t.id !== taskId));
  }

  // ─── Pipelines ──────────────────────────────────────────────────────

  async listPipelines(projectId: string): Promise<Pipeline[]> {
    return readJSON<Pipeline[]>(key("pipelines", projectId), []);
  }

  async savePipeline(projectId: string, pipeline: Pipeline): Promise<Pipeline> {
    const pipelines = await this.listPipelines(projectId);
    const idx = pipelines.findIndex((p) => p.id === pipeline.id);
    if (idx >= 0) {
      pipelines[idx] = pipeline;
    } else {
      pipelines.unshift(pipeline);
    }
    writeJSON(key("pipelines", projectId), pipelines);
    return pipeline;
  }

  async deletePipeline(projectId: string, pipelineId: string): Promise<void> {
    const pipelines = await this.listPipelines(projectId);
    writeJSON(key("pipelines", projectId), pipelines.filter((p) => p.id !== pipelineId));
  }

  // ─── Memory Documents ──────────────────────────────────────────────

  async listMemoryDocs(projectId: string): Promise<MemoryDocument[]> {
    return readJSON<MemoryDocument[]>(key("memory", projectId), []);
  }

  async addMemoryDoc(projectId: string, doc: MemoryDocument): Promise<MemoryDocument> {
    const docs = await this.listMemoryDocs(projectId);
    docs.unshift(doc);
    writeJSON(key("memory", projectId), docs);
    return doc;
  }

  async updateMemoryDoc(projectId: string, docId: string, updates: Partial<MemoryDocument>): Promise<MemoryDocument> {
    const docs = await this.listMemoryDocs(projectId);
    const idx = docs.findIndex((d) => d.id === docId);
    if (idx === -1) throw new Error(`Memory doc ${docId} not found`);
    docs[idx] = { ...docs[idx], ...updates, updatedAt: Date.now() };
    writeJSON(key("memory", projectId), docs);
    return docs[idx];
  }

  async deleteMemoryDoc(projectId: string, docId: string): Promise<void> {
    const docs = await this.listMemoryDocs(projectId);
    writeJSON(key("memory", projectId), docs.filter((d) => d.id !== docId));
  }

  // ─── Triggers ───────────────────────────────────────────────────────

  async listTriggers(projectId: string): Promise<ProjectTrigger[]> {
    return readJSON<ProjectTrigger[]>(key("triggers", projectId), []);
  }

  async saveTrigger(projectId: string, trigger: ProjectTrigger): Promise<ProjectTrigger> {
    const triggers = await this.listTriggers(projectId);
    const idx = triggers.findIndex((t) => t.id === trigger.id);
    if (idx >= 0) {
      triggers[idx] = trigger;
    } else {
      triggers.unshift(trigger);
    }
    writeJSON(key("triggers", projectId), triggers);
    return trigger;
  }

  async deleteTrigger(projectId: string, triggerId: string): Promise<void> {
    const triggers = await this.listTriggers(projectId);
    writeJSON(key("triggers", projectId), triggers.filter((t) => t.id !== triggerId));
  }
}
