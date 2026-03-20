import type { ProjectStorageAdapter } from "./adapter";
import type {
  BoardGroup,
  Project,
  Task,
  Pipeline,
  MemoryDocument,
  ProjectTrigger,
} from "../types-project";

const MC_API = "/api/mc";

async function mcFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${MC_API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MC API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export class SupabaseAdapter implements ProjectStorageAdapter {
  // ─── Board Groups ──────────────────────────────────────────────────

  async listGroups(): Promise<BoardGroup[]> {
    return mcFetch("/groups");
  }

  async createGroup(group: BoardGroup): Promise<BoardGroup> {
    return mcFetch("/groups", { method: "POST", body: JSON.stringify(group) });
  }

  async updateGroup(id: string, updates: Partial<BoardGroup>): Promise<BoardGroup> {
    return mcFetch(`/groups/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
  }

  async deleteGroup(id: string): Promise<void> {
    return mcFetch(`/groups/${id}`, { method: "DELETE" });
  }

  // ─── Projects ───────────────────────────────────────────────────────

  async listProjects(): Promise<Project[]> {
    return mcFetch("/projects");
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.listProjects();
    return projects.find((p) => p.id === id) ?? null;
  }

  async createProject(project: Project): Promise<Project> {
    return mcFetch("/projects", { method: "POST", body: JSON.stringify(project) });
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return mcFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(updates) });
  }

  async deleteProject(id: string): Promise<void> {
    return mcFetch(`/projects/${id}`, { method: "DELETE" });
  }

  // ─── Tasks ──────────────────────────────────────────────────────────

  async listTasks(projectId: string): Promise<Task[]> {
    return mcFetch(`/tasks/${projectId}`);
  }

  async createTask(projectId: string, task: Task): Promise<Task> {
    return mcFetch(`/tasks/${projectId}`, { method: "POST", body: JSON.stringify(task) });
  }

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    return mcFetch(`/tasks/${projectId}/${taskId}`, { method: "PATCH", body: JSON.stringify(updates) });
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    return mcFetch(`/tasks/${projectId}/${taskId}`, { method: "DELETE" });
  }

  // ─── Pipelines ──────────────────────────────────────────────────────

  async listPipelines(projectId: string): Promise<Pipeline[]> {
    return mcFetch(`/pipelines/${projectId}`);
  }

  async savePipeline(projectId: string, pipeline: Pipeline): Promise<Pipeline> {
    return mcFetch(`/pipelines/${projectId}`, { method: "POST", body: JSON.stringify(pipeline) });
  }

  async deletePipeline(projectId: string, pipelineId: string): Promise<void> {
    return mcFetch(`/pipelines/${projectId}/${pipelineId}`, { method: "DELETE" });
  }

  // ─── Memory Documents ──────────────────────────────────────────────

  async listMemoryDocs(projectId: string): Promise<MemoryDocument[]> {
    return mcFetch(`/memory-docs/${projectId}`);
  }

  async addMemoryDoc(projectId: string, doc: MemoryDocument): Promise<MemoryDocument> {
    return mcFetch(`/memory-docs/${projectId}`, { method: "POST", body: JSON.stringify(doc) });
  }

  async updateMemoryDoc(projectId: string, docId: string, updates: Partial<MemoryDocument>): Promise<MemoryDocument> {
    return mcFetch(`/memory-docs/${projectId}/${docId}`, { method: "PATCH", body: JSON.stringify(updates) });
  }

  async deleteMemoryDoc(projectId: string, docId: string): Promise<void> {
    return mcFetch(`/memory-docs/${projectId}/${docId}`, { method: "DELETE" });
  }

  // ─── Triggers ───────────────────────────────────────────────────────

  async listTriggers(projectId: string): Promise<ProjectTrigger[]> {
    return mcFetch(`/triggers/${projectId}`);
  }

  async saveTrigger(projectId: string, trigger: ProjectTrigger): Promise<ProjectTrigger> {
    return mcFetch(`/triggers/${projectId}`, { method: "POST", body: JSON.stringify(trigger) });
  }

  async deleteTrigger(projectId: string, triggerId: string): Promise<void> {
    return mcFetch(`/triggers/${projectId}/${triggerId}`, { method: "DELETE" });
  }
}
