"use client";

import { create } from "zustand";
import type { ChatMessage, ChatMode, AgentChatSession } from "./types-chat";
import { chatSessionKey } from "./types-chat";
import { useGatewayStore } from "./gateway-store";
import { useProjectsStore } from "./projects-store";
import { buildAgentSessionKey } from "./session-routing";

interface ChatStore {
  sessions: Record<string, AgentChatSession>;
  unreadCounts: Record<string, number>;
  /** Agent IDs currently being processed (agent is thinking) */
  thinkingAgents: Set<string>;

  getChatSession: (opts:
    | { mode: "task"; taskId: string }
    | { mode: "direct"; projectId: string; agentId: string }
    | { mode: "em"; projectId: string }
  ) => AgentChatSession | undefined;

  sendMessage: (opts: {
    mode: ChatMode;
    content: string;
    agentId: string;
    agentName: string;
    projectId: string;
    taskId?: string;
  }) => Promise<void>;

  receiveMessage: (sessionKey: string, message: ChatMessage) => void;
  setThinking: (gatewaySessionKey: string, thinking: boolean) => void;
  closeSession: (sessionKey: string) => void;
  markRead: (sessionKey: string) => void;

  _hydrateFromStorage: () => void;
  _persistToStorage: () => void;
}

const STORAGE_KEY = "rikuchan:chat-sessions";
const MAX_MESSAGES_PER_SESSION = 100;

function loadSessions(): Record<string, AgentChatSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSessions(sessions: Record<string, AgentChatSession>) {
  if (typeof window === "undefined") return;
  // Trim messages before saving
  const trimmed: Record<string, AgentChatSession> = {};
  for (const [key, session] of Object.entries(sessions)) {
    trimmed[key] = {
      ...session,
      messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: {},
  unreadCounts: {},
  thinkingAgents: new Set<string>(),

  _hydrateFromStorage: () => {
    set({ sessions: loadSessions() });
  },

  _persistToStorage: () => {
    saveSessions(get().sessions);
  },

  getChatSession: (opts) => {
    const key = chatSessionKey(opts);
    return get().sessions[key];
  },

  sendMessage: async (opts) => {
    const { mode, content, agentId, agentName, projectId, taskId } = opts;
    const keyOpts = mode === "task"
      ? { mode: "task" as const, taskId: taskId! }
      : mode === "em"
        ? { mode: "em" as const, projectId }
        : { mode: "direct" as const, projectId, agentId };
    const key = chatSessionKey(keyOpts);

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: `msg-${now}-${Math.random().toString(16).slice(2, 6)}`,
      role: "user",
      content,
      timestamp: now,
      taskId,
    };

    // Ensure session exists
    set((s) => {
      const existing = s.sessions[key];
      const session: AgentChatSession = existing ?? {
        id: key,
        projectId,
        agentId,
        agentName,
        mode,
        taskId,
        messages: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      return {
        sessions: {
          ...s.sessions,
          [key]: {
            ...session,
            messages: [...session.messages, userMsg],
            updatedAt: now,
          },
        },
      };
    });

    // Send to gateway via chat.send
    const ws = useGatewayStore.getState()._ws;
    if (ws?.readyState === WebSocket.OPEN) {
      const project = useProjectsStore.getState().projects.find((p) => p.id === projectId);
      const group = project?.groupId
        ? useProjectsStore.getState().groups.find((g) => g.id === project.groupId)
        : undefined;
      const sessionKeyStr = project
        ? buildAgentSessionKey(agentId, project, group?.agentId)
        : `agent:${agentId}:main`;
      const reqId = `chat-${now}-${Math.random().toString(16).slice(2, 6)}`;

      ws.send(JSON.stringify({
        type: "req",
        id: reqId,
        method: "chat.send",
        params: {
          sessionKey: sessionKeyStr,
          message: content,
          idempotencyKey: `chat-${key}-${now}`,
        },
      }));

      // Mark agent as thinking immediately after sending
      get().setThinking(sessionKeyStr, true);
    }

    get()._persistToStorage();
  },

  setThinking: (gatewaySessionKey, thinking) => {
    // gatewaySessionKey: "agent:<agentId>:<scope>"
    const agentId = gatewaySessionKey.split(":")[1] ?? gatewaySessionKey;
    set((s) => {
      const next = new Set(s.thinkingAgents);
      if (thinking) next.add(agentId);
      else next.delete(agentId);
      return { thinkingAgents: next };
    });
  },

  receiveMessage: (gatewaySessionKey, message) => {
    // gatewaySessionKey format: "agent:<agentId>:<scope>"
    // Map to chat session key by finding a session whose agentId matches
    const agentIdFromGw = gatewaySessionKey.split(":")[1] ?? "";
    set((s) => {
      // Find matching chat session — prefer exact gateway key match, then agentId match
      const sessionKey = Object.keys(s.sessions).find((k) => {
        const session = s.sessions[k];
        return session.agentId === agentIdFromGw ||
          session.agentId.includes(agentIdFromGw) ||
          agentIdFromGw.includes(session.agentId);
      });
      const session = sessionKey ? s.sessions[sessionKey] : undefined;
      if (!session || !sessionKey) return s;

      const agentId = session.agentId;
      return {
        sessions: {
          ...s.sessions,
          [sessionKey]: {
            ...session,
            messages: [...session.messages, message].slice(-MAX_MESSAGES_PER_SESSION),
            updatedAt: Date.now(),
          },
        },
        unreadCounts: {
          ...s.unreadCounts,
          [agentId]: (s.unreadCounts[agentId] ?? 0) + 1,
        },
      };
    });
    get()._persistToStorage();
  },

  closeSession: (sessionKey) => {
    set((s) => {
      const session = s.sessions[sessionKey];
      if (!session) return s;
      return {
        sessions: {
          ...s.sessions,
          [sessionKey]: { ...session, status: "closed", updatedAt: Date.now() },
        },
      };
    });
    get()._persistToStorage();
  },

  markRead: (sessionKey) => {
    set((s) => {
      const session = s.sessions[sessionKey];
      if (!session) return s;
      return {
        unreadCounts: {
          ...s.unreadCounts,
          [session.agentId]: 0,
        },
      };
    });
  },
}));
