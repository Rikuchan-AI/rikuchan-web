import type {
  BoardGroup,
  Project,
  Task,
  Pipeline,
  MemoryDocument,
  ProjectTrigger,
} from "../types-project";

/**
 * Storage adapter interface for project data persistence.
 *
 * Implementations:
 *   - LocalStorageAdapter (default) — persists to browser localStorage
 *   - SupabaseAdapter (future)      — persists to Supabase with RLS
 *   - GatewayAdapter (future)       — persists via OpenClaw gateway RPCs
 */
export interface ProjectStorageAdapter {
  // ─── Board Groups ──────────────────────────────────────────────────
  listGroups(): Promise<BoardGroup[]>;
  createGroup(group: BoardGroup): Promise<BoardGroup>;
  updateGroup(id: string, updates: Partial<BoardGroup>): Promise<BoardGroup>;
  deleteGroup(id: string): Promise<void>;

  // ─── Projects ───────────────────────────────────────────────────────
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(project: Project): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // ─── Tasks ──────────────────────────────────────────────────────────
  listTasks(projectId: string): Promise<Task[]>;
  createTask(projectId: string, task: Task): Promise<Task>;
  updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(projectId: string, taskId: string): Promise<void>;

  // ─── Pipelines ──────────────────────────────────────────────────────
  listPipelines(projectId: string): Promise<Pipeline[]>;
  savePipeline(projectId: string, pipeline: Pipeline): Promise<Pipeline>;
  deletePipeline(projectId: string, pipelineId: string): Promise<void>;

  // ─── Memory Documents ──────────────────────────────────────────────
  listMemoryDocs(projectId: string): Promise<MemoryDocument[]>;
  addMemoryDoc(projectId: string, doc: MemoryDocument): Promise<MemoryDocument>;
  updateMemoryDoc(projectId: string, docId: string, updates: Partial<MemoryDocument>): Promise<MemoryDocument>;
  deleteMemoryDoc(projectId: string, docId: string): Promise<void>;

  // ─── Triggers ───────────────────────────────────────────────────────
  listTriggers(projectId: string): Promise<ProjectTrigger[]>;
  saveTrigger(projectId: string, trigger: ProjectTrigger): Promise<ProjectTrigger>;
  deleteTrigger(projectId: string, triggerId: string): Promise<void>;
}
