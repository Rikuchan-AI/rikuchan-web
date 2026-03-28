"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { AlertCircle } from "lucide-react";
import { ChatInput } from "@/components/mc/projects/chat/ChatInput";
import { TypingIndicator } from "@/components/mc/projects/chat/ChatBubble";
import { useChatStore } from "@/lib/mc/chat-store";
import { getApiClient } from "@/lib/mc/api-client";
import type { Task, Project } from "@/lib/mc/types-project";

interface TaskChatPanelProps {
  task: Task;
  project: Project;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mapMessages(data: unknown[]): { id: string; senderType: string; senderName: string; content: string; createdAt: string }[] {
  return (data as { id: string; senderType: string; senderName: string; content: string; createdAt: string }[]).map((m) => ({
    id: m.id, senderType: m.senderType, senderName: m.senderName, content: m.content, createdAt: m.createdAt,
  }));
}

export function TaskChatPanel({ task, project }: TaskChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((s) => s.taskChatMessages[task.id]);
  const isLoading = useChatStore((s) => s.taskChatLoading[task.id]);
  const isThinking = useChatStore((s) => task.assignedAgentId ? s.thinkingAgents.has(task.assignedAgentId) : false);

  // Fetch chat history on mount
  useEffect(() => {
    let cancelled = false;
    const store = useChatStore.getState();

    // Only fetch if we haven't loaded yet
    if (store.taskChatMessages[task.id]) return;

    store.setTaskChatLoading(task.id, true);
    getApiClient().tasks.chatHistory(project.id, task.id, 100)
      .then((data) => {
        if (!cancelled) useChatStore.getState().setTaskChatMessages(task.id, mapMessages(data as unknown[]));
      })
      .catch(() => {
        if (!cancelled) useChatStore.getState().setTaskChatMessages(task.id, []);
      })
      .finally(() => {
        if (!cancelled) useChatStore.getState().setTaskChatLoading(task.id, false);
      });

    return () => { cancelled = true; };
  }, [task.id, project.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Clear error after 5s
  useEffect(() => {
    if (!sendError) return;
    const t = setTimeout(() => setSendError(null), 5000);
    return () => clearTimeout(t);
  }, [sendError]);

  const handleSend = useCallback(async (content: string) => {
    setSending(true);
    setSendError(null);
    setInput("");

    // Optimistic: add message immediately
    const optimisticId = `optimistic-${Date.now()}`;
    useChatStore.getState().receiveTaskChatMessage(task.id, project.id, {
      id: optimisticId,
      senderType: "human",
      senderName: "You",
      content,
      createdAt: new Date().toISOString(),
    });

    try {
      const result = await getApiClient().tasks.chatSend(project.id, task.id, content) as unknown as { delivered?: boolean };
      if (result && !result.delivered) {
        setSendError("Message saved but agent is offline. It will be delivered when the agent reconnects.");
      }
    } catch {
      setSendError("Failed to send message.");
      // Re-fetch to remove optimistic message
      getApiClient().tasks.chatHistory(project.id, task.id, 100)
        .then((data) => useChatStore.getState().setTaskChatMessages(task.id, mapMessages(data as unknown[])))
        .catch(() => {});
    } finally {
      setSending(false);
    }
  }, [task.id, project.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs text-foreground-muted animate-pulse">Loading messages...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      {/* Paused banner */}
      {task.status === "paused" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-warm-soft border border-warm/15 px-3 py-2">
          <span className="text-warm text-sm">&#9208;</span>
          <span className="text-sm text-warm">Task paused</span>
        </div>
      )}

      {/* Error banner */}
      {sendError && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-danger-soft border border-danger/15 px-3 py-2">
          <AlertCircle size={13} className="text-danger shrink-0" />
          <span className="text-xs text-danger">{sendError}</span>
        </div>
      )}

      {/* No agent warning */}
      {!task.assignedAgentId && task.status !== "done" && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-warm-soft border border-warm/15 px-3 py-2">
          <span className="text-xs text-warm">No agent assigned. Messages are saved but won&apos;t be delivered until an agent is assigned.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {(!messages || messages.length === 0) && (
          <p className="text-center text-xs text-foreground-muted italic mt-8">
            {task.assignedAgentId
              ? `Messages from ${task.assignedAgentName ?? "the agent"} will appear here`
              : "Send a message to start the conversation"}
          </p>
        )}
        {messages?.map((msg) => {
          const isHuman = msg.senderType === "human";
          return (
            <div key={msg.id} className={`flex flex-col ${isHuman ? "items-end" : "items-start"}`}>
              {!isHuman && (
                <span className="mb-1 mono text-[10px] text-foreground-muted uppercase" style={{ letterSpacing: "0.06em" }}>
                  {msg.senderName}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                  isHuman
                    ? "bg-accent text-accent-foreground rounded-br-sm"
                    : "bg-surface-muted text-foreground border border-line rounded-bl-sm"
                } ${msg.id.startsWith("optimistic-") ? "opacity-60" : ""}`}
              >
                {isHuman ? (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                ) : (
                  <div className="prose-sm prose-invert max-w-none [&_p]:mb-1 [&_p]:last:mb-0 [&_ul]:ml-3 [&_ul]:list-disc [&_ol]:ml-3 [&_ol]:list-decimal [&_li]:mb-0.5 [&_code]:bg-surface [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-surface [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_strong]:font-semibold [&_a]:text-accent [&_a]:underline">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
              <span className="mt-1 mono text-[10px] text-foreground-muted">
                {formatTime(msg.createdAt)}
              </span>
            </div>
          );
        })}
        {isThinking && <TypingIndicator agentName={task.assignedAgentName ?? "Agent"} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 border-t border-line pt-3">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder={`Message ${task.assignedAgentName ?? "about this task"}...`}
          disabled={task.status === "done"}
          sending={sending}
        />
      </div>
    </div>
  );
}
