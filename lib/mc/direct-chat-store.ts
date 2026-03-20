"use client";

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GatewayMeta {
  rag?: string;        // "hit:3", "skipped", "disabled"
  provider?: string;   // "anthropic", "zai_general"
  actualModel?: string; // set when different from requested
  latencyMs?: number;
}

export interface DirectChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  gateway?: GatewayMeta;
  timestamp: number;
}

export interface DirectConversation {
  id: string;
  title: string;
  messages: DirectChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

interface DirectChatStore {
  conversations: DirectConversation[];
  activeConversationId: string | null;
  sending: boolean;
  streamingMessageId: string | null;

  createConversation: (model?: string) => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  setConversationModel: (id: string, model: string) => void;
  setActiveConversation: (id: string | null) => void;
  getConversation: (id: string) => DirectConversation | undefined;

  sendMessage: (conversationId: string, content: string) => Promise<void>;

  _hydrate: () => void;
  _persist: () => void;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "rikuchan:direct-chat";
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 200;
const DEFAULT_MODEL = "glm-4.7-flash";

function load(): DirectConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(conversations: DirectConversation[]) {
  if (typeof window === "undefined") return;
  const trimmed = conversations
    .slice(0, MAX_CONVERSATIONS)
    .map((c) => ({ ...c, messages: c.messages.slice(-MAX_MESSAGES) }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ─── Gateway streaming ──────────────────────────────────────────────────────

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

async function getClerkToken(): Promise<string | null> {
  try {
    const clerk = (window as any).Clerk;
    if (clerk?.session) {
      return await clerk.session.getToken();
    }
  } catch { /* no clerk */ }
  return null;
}

function extractGatewayMeta(res: Response): GatewayMeta {
  const gateway: GatewayMeta = {};
  const ragHeader = res.headers.get("x-rikuchan-rag");
  if (ragHeader) gateway.rag = ragHeader;
  const provider = res.headers.get("x-rikuchan-provider");
  if (provider) gateway.provider = provider;
  const actualModel = res.headers.get("x-rikuchan-model");
  if (actualModel) gateway.actualModel = actualModel;
  const latency = res.headers.get("x-rikuchan-latency-ms");
  if (latency) gateway.latencyMs = parseFloat(latency);
  return gateway;
}

/**
 * Extract final content from a non-streaming JSON response.
 * Handles OpenAI and Anthropic formats. Never returns reasoning_content.
 */
function extractContentFromResponse(data: Record<string, unknown>): string | null {
  // OpenAI: { choices: [{ message: { content } }] }
  const msg = (data.choices as Array<{ message?: { content?: string } }>)?.[0]?.message;
  if (msg?.content) return msg.content;

  // Anthropic: { content: [{ type: "text", text }] }
  if (Array.isArray(data.content)) {
    const textBlock = (data.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === "text",
    );
    if (textBlock?.text) return textBlock.text;
  }

  // Error
  if (data.error && typeof data.error === "object") {
    return (data.error as { message?: string }).message ?? null;
  }

  return null;
}

/**
 * Parse an SSE text chunk and extract content delta.
 * Handles both OpenAI and Anthropic streaming formats.
 */
function extractDeltaFromSSE(line: string): string | null {
  if (!line.startsWith("data: ")) return null;
  const data = line.slice(6).trim();
  if (data === "[DONE]") return null;

  try {
    const parsed = JSON.parse(data);

    // OpenAI streaming: { choices: [{ delta: { content: "token" } }] }
    const delta = parsed.choices?.[0]?.delta?.content;
    if (typeof delta === "string") return delta;

    // OpenAI non-streaming in SSE: { choices: [{ message: { content: "full" } }] }
    const msg = parsed.choices?.[0]?.message?.content;
    if (typeof msg === "string" && msg) return msg;

    // Anthropic format: { type: "content_block_delta", delta: { text: "token" } }
    if (parsed.type === "content_block_delta") {
      const text = parsed.delta?.text;
      if (typeof text === "string") return text;
    }

    return null;
  } catch {
    return null;
  }
}

async function chatCompletionStream(
  messages: { role: string; content: string }[],
  model: string,
  onDelta: (token: string) => void,
  onMeta: (gateway: GatewayMeta, model: string) => void,
): Promise<void> {
  const token = await getClerkToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-client-id": "rikuchan-web",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway ${res.status}: ${text}`);
  }

  // Extract gateway metadata from response headers (available immediately)
  const gateway = extractGatewayMeta(res);
  onMeta(gateway, model);

  const contentType = res.headers.get("content-type") || "";
  const isSSE = contentType.includes("text/event-stream");

  if (isSSE && res.body) {
    // Stream SSE tokens
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const delta = extractDeltaFromSSE(trimmed);
        if (delta) onDelta(delta);
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const delta = extractDeltaFromSSE(buffer.trim());
      if (delta) onDelta(delta);
    }
  } else {
    // Non-streaming fallback (JSON response)
    const data = await res.json();
    const content = extractContentFromResponse(data);
    if (content) onDelta(content);
    else onDelta("(empty response)");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mkId() {
  return `conv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function mkMsgId() {
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function generateTitle(content: string): string {
  const trimmed = content.trim().slice(0, 60);
  return trimmed.length < content.trim().length ? trimmed + "..." : trimmed;
}

/** Update a specific message's content in a conversation */
function updateMessageContent(
  conversations: DirectConversation[],
  conversationId: string,
  messageId: string,
  updater: (msg: DirectChatMessage) => DirectChatMessage,
): DirectConversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationId) return c;
    return {
      ...c,
      messages: c.messages.map((m) => (m.id === messageId ? updater(m) : m)),
      updatedAt: Date.now(),
    };
  });
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useDirectChatStore = create<DirectChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  sending: false,
  streamingMessageId: null,

  _hydrate: () => {
    set({ conversations: load() });
  },

  _persist: () => {
    save(get().conversations);
  },

  createConversation: (model) => {
    const id = mkId();
    const now = Date.now();
    const conv: DirectConversation = {
      id,
      title: "New conversation",
      messages: [],
      model: model ?? DEFAULT_MODEL,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      conversations: [conv, ...s.conversations],
      activeConversationId: id,
    }));
    get()._persist();
    return id;
  },

  deleteConversation: (id) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }));
    get()._persist();
  },

  renameConversation: (id, title) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c,
      ),
    }));
    get()._persist();
  },

  setConversationModel: (id, model) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, model, updatedAt: Date.now() } : c,
      ),
    }));
    get()._persist();
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
  },

  getConversation: (id) => {
    return get().conversations.find((c) => c.id === id);
  },

  sendMessage: async (conversationId, content) => {
    const now = Date.now();
    const userMsg: DirectChatMessage = {
      id: mkMsgId(),
      role: "user",
      content,
      timestamp: now,
    };

    const assistantMsgId = mkMsgId();
    const assistantMsg: DirectChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: now,
    };

    // Append user message + empty assistant placeholder
    set((s) => {
      const convs = s.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          title: isFirst ? generateTitle(content) : c.title,
          messages: [...c.messages, userMsg, assistantMsg],
          updatedAt: now,
        };
      });
      return { conversations: convs, sending: true, streamingMessageId: assistantMsgId };
    });
    get()._persist();

    try {
      const conv = get().conversations.find((c) => c.id === conversationId);
      if (!conv) return;

      // Build messages for API (exclude the empty assistant placeholder)
      const apiMessages = conv.messages
        .filter((m) => m.id !== assistantMsgId)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));

      await chatCompletionStream(
        apiMessages,
        conv.model,
        // onDelta: append token to assistant message
        (token) => {
          set((s) => ({
            conversations: updateMessageContent(
              s.conversations,
              conversationId,
              assistantMsgId,
              (msg) => ({ ...msg, content: msg.content + token }),
            ),
          }));
        },
        // onMeta: update gateway metadata on assistant message
        (gateway, model) => {
          set((s) => ({
            conversations: updateMessageContent(
              s.conversations,
              conversationId,
              assistantMsgId,
              (msg) => ({ ...msg, gateway, model }),
            ),
          }));
        },
      );

      set({ sending: false, streamingMessageId: null });
    } catch (err) {
      // Update the assistant placeholder with error
      set((s) => ({
        conversations: updateMessageContent(
          s.conversations,
          conversationId,
          assistantMsgId,
          (msg) => ({
            ...msg,
            content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
          }),
        ),
        sending: false,
        streamingMessageId: null,
      }));
    }
    get()._persist();
  },
}));
