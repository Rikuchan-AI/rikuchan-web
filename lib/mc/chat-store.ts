"use client";

import { create } from "zustand";
import type { ChatMessage, ChatMode, AgentChatSession } from "./types-chat";
import { chatSessionKey } from "./types-chat";
import { getApiClient } from "./api-client";

interface ChatStore {
  sessions: Record<string, AgentChatSession>;
  unreadCounts: Record<string, number>;
  thinkingAgents: Set<string>;

  getChatSession: (
    opts:
      | { mode: "task"; taskId: string }
      | { mode: "direct"; projectId: string; agentId: string }
      | { mode: "em"; projectId: string },
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
    const keyOpts =
      mode === "task"
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

    // Ensure session exists and add user message
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

    // Send to backend via REST API
    try {
      await getApiClient().projects.chat(projectId, content);
    } catch (err) {
      console.error("[chat] Failed to send message:", err);
    }

    get()._persistToStorage();
  },

  setThinking: (gatewaySessionKey, thinking) => {
    const agentId = gatewaySessionKey.split(":")[1] ?? gatewaySessionKey;
    set((s) => {
      const next = new Set(s.thinkingAgents);
      if (thinking) next.add(agentId);
      else next.delete(agentId);
      return { thinkingAgents: next };
    });
  },

  receiveMessage: (gatewaySessionKey, message) => {
    const agentIdFromGw = gatewaySessionKey.split(":")[1] ?? "";
    set((s) => {
      const allKeys = Object.keys(s.sessions);

      const agentMatches = (session: AgentChatSession) =>
        session.agentId === agentIdFromGw ||
        session.agentId.includes(agentIdFromGw) ||
        agentIdFromGw.includes(session.agentId);

      const lastMessageIsUser = (session: AgentChatSession) => {
        const last = session.messages[session.messages.length - 1];
        return last?.role === "user";
      };

      const pending = allKeys.filter(
        (k) => agentMatches(s.sessions[k]) && lastMessageIsUser(s.sessions[k]),
      );
      const fallback = allKeys.filter((k) => agentMatches(s.sessions[k]));

      const candidates = pending.length > 0 ? pending : fallback;
      const sessionKey = candidates.sort(
        (a, b) =>
          (s.sessions[b].updatedAt ?? 0) - (s.sessions[a].updatedAt ?? 0),
      )[0];

      const session = sessionKey ? s.sessions[sessionKey] : undefined;
      if (!session || !sessionKey) return s;

      const agentId = session.agentId;
      return {
        sessions: {
          ...s.sessions,
          [sessionKey]: {
            ...session,
            messages: [...session.messages, message].slice(
              -MAX_MESSAGES_PER_SESSION,
            ),
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
          [sessionKey]: {
            ...session,
            status: "closed",
            updatedAt: Date.now(),
          },
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
