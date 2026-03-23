"use client";

import type {
  Agent,
  Session,
  ModelGroup,
  GatewayConfig,
  HeartbeatConfig,
} from "./types";
import type {
  BoardGroup,
  Project,
  Task,
  Pipeline,
  MemoryDocument,
  ProjectTrigger,
} from "./types-project";

// ─── Error Types ─────────────────────────────────────────────────────────────

export class McApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "McApiError";
  }
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export type CreateProjectInput = Omit<Project, "taskCount" | "memoryDocCount">;
export type UpdateProjectInput = Partial<Project>;
export type CreateTaskInput = Omit<Task, "subtasks">;
export type UpdateTaskInput = Partial<Task>;
export type CreateGroupInput = Omit<BoardGroup, "createdAt" | "updatedAt">;
export type UpdateGroupInput = Partial<BoardGroup>;
export type CreateMemoryDocInput = MemoryDocument;
export type UpdateMemoryDocInput = Partial<MemoryDocument>;

export interface UserSettings {
  gatewayUrl?: string;
  telegramChatId?: string;
  preferences?: Record<string, unknown>;
}

export interface McNotification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

class McApiClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string | null>,
  ) {}

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new McApiError("UNAUTHORIZED", "No auth token", 401);

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 204) return undefined as T;

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = body.error as
        | { code: string; message: string; details?: Record<string, unknown> }
        | undefined;
      throw new McApiError(
        error?.code || "UNKNOWN",
        error?.message || response.statusText,
        response.status,
        error?.details,
      );
    }

    const body = await response.json();
    const result = body.data ?? body;
    console.debug(`[mc-api] ${options.method ?? "GET"} ${path} →`, { status: response.status, hasData: "data" in body, resultType: Array.isArray(result) ? `array(${result.length})` : typeof result });
    return result;
  }

  // ─── Projects ───

  projects = {
    list: () => this.request<Project[]>("/api/projects"),
    get: (id: string) => this.request<Project>(`/api/projects/${id}`),
    create: (data: CreateProjectInput) =>
      this.request<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateProjectInput) =>
      this.request<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/api/projects/${id}`, { method: "DELETE" }),

    // Lifecycle
    activate: (id: string, gateway?: { url: string; token: string }) =>
      this.request<{ sessionId: string }>(`/api/projects/${id}/activate`, {
        method: "POST",
        body: gateway ? JSON.stringify({ gatewayUrl: gateway.url, gatewayToken: gateway.token }) : undefined,
      }),
    pause: (id: string) =>
      this.request<void>(`/api/projects/${id}/pause`, { method: "POST" }),
    resume: (id: string) =>
      this.request<{ sessionId: string }>(`/api/projects/${id}/resume`, {
        method: "POST",
      }),
    complete: (id: string) =>
      this.request<void>(`/api/projects/${id}/complete`, { method: "POST" }),

    // Chat with lead
    chat: (id: string, message: string) =>
      this.request<void>(`/api/projects/${id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
  };

  // ─── Tasks ───

  tasks = {
    list: (projectId: string) =>
      this.request<Task[]>(`/api/projects/${projectId}/tasks`),
    create: (projectId: string, data: CreateTaskInput) =>
      this.request<Task>(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (projectId: string, taskId: string, data: UpdateTaskInput) =>
      this.request<Task>(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, taskId: string) =>
      this.request<void>(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "DELETE",
      }),
    move: (projectId: string, taskId: string, data: { status: string }) =>
      this.request<Task>(`/api/projects/${projectId}/tasks/${taskId}/move`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delegate: (projectId: string, taskId: string) =>
      this.request<void>(
        `/api/projects/${projectId}/tasks/${taskId}/delegate`,
        { method: "POST" },
      ),
  };

  // ─── Agents ───

  agents = {
    list: () => this.request<Agent[]>("/api/agents"),
  };

  // ─── Gateway ───

  gateway = {
    connect: (url?: string, token?: string) =>
      this.request<{ status: string; connId?: string }>("/api/gateway/connect", {
        method: "POST",
        body: JSON.stringify({ url, token }),
      }),
    disconnect: () =>
      this.request<{ status: string }>("/api/gateway/disconnect", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    status: () =>
      this.request<{ connected: boolean; connId?: string; serverVersion?: string }>("/api/gateway/status"),
  };

  gatewayRpc = (method: string, params: Record<string, unknown> = {}) =>
    this.request<Record<string, unknown>>("/api/gateway/rpc", {
      method: "POST",
      body: JSON.stringify({ method, params }),
    });

  // ─── Groups ───

  groups = {
    list: () => this.request<BoardGroup[]>("/api/groups"),
    create: (data: CreateGroupInput) =>
      this.request<BoardGroup>("/api/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateGroupInput) =>
      this.request<BoardGroup>(`/api/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      this.request<void>(`/api/groups/${id}`, { method: "DELETE" }),
  };

  // ─── Memory Docs ───

  memoryDocs = {
    list: (projectId: string) =>
      this.request<MemoryDocument[]>(
        `/api/projects/${projectId}/memory-docs`,
      ),
    create: (projectId: string, data: CreateMemoryDocInput) =>
      this.request<MemoryDocument>(
        `/api/projects/${projectId}/memory-docs`,
        { method: "POST", body: JSON.stringify(data) },
      ),
    update: (
      projectId: string,
      docId: string,
      data: UpdateMemoryDocInput,
    ) =>
      this.request<MemoryDocument>(
        `/api/projects/${projectId}/memory-docs/${docId}`,
        { method: "PATCH", body: JSON.stringify(data) },
      ),
    delete: (projectId: string, docId: string) =>
      this.request<void>(
        `/api/projects/${projectId}/memory-docs/${docId}`,
        { method: "DELETE" },
      ),
  };

  // ─── Notifications ───

  notifications = {
    list: () => this.request<McNotification[]>("/api/notifications"),
    markRead: (id: string) =>
      this.request<void>(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      }),
  };

  // ─── Settings ───

  settings = {
    get: () => this.request<UserSettings>("/api/settings"),
    update: (data: Partial<UserSettings>) =>
      this.request<UserSettings>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  };
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _client: McApiClient | null = null;

export function initApiClient(
  baseUrl: string,
  getToken: () => Promise<string | null>,
) {
  _client = new McApiClient(baseUrl, getToken);
}

export function getApiClient(): McApiClient {
  if (!_client)
    throw new Error("McApiClient not initialized. Call initApiClient() first.");
  return _client;
}
