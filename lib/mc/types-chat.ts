export type ChatMode = "task" | "direct" | "em";

export type ChatMessageRole = "user" | "agent" | "system";

export interface ChatToolCall {
  name: string;
  input: unknown;
  output?: unknown;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  toolCall?: ChatToolCall;
  taskId?: string;
}

export interface AgentChatSession {
  id: string;
  projectId: string;
  agentId: string;
  agentName: string;
  mode: ChatMode;
  taskId?: string;
  messages: ChatMessage[];
  status: "active" | "paused_task" | "closed";
  createdAt: number;
  updatedAt: number;
}

export function chatSessionKey(opts:
  | { mode: "task"; taskId: string }
  | { mode: "direct"; projectId: string; agentId: string }
  | { mode: "em"; projectId: string }
): string {
  switch (opts.mode) {
    case "task":   return `task:${opts.taskId}`;
    case "direct": return `direct:${opts.projectId}:${opts.agentId}`;
    case "em":     return `em:${opts.projectId}`;
  }
}

export const EM_SUGGESTED_PROMPTS = [
  "Priorize as tasks mais urgentes",
  "Qual agent está sobrecarregado?",
  "Crie tasks para o sprint desta semana",
  "Resuma o progresso do projeto",
  "Quais tasks estão bloqueadas e por quê?",
  "Redistribua as tasks entre os agents",
];
