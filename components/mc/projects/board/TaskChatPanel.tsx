"use client";

import { useState, useRef, useEffect } from "react";
import { ChatBubble } from "@/components/mc/projects/chat/ChatBubble";
import { ChatInput } from "@/components/mc/projects/chat/ChatInput";
import { useChatStore } from "@/lib/mc/chat-store";
import type { Task, Project } from "@/lib/mc/types-project";

interface TaskChatPanelProps {
  task: Task;
  project: Project;
}

export function TaskChatPanel({ task, project }: TaskChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const session = useChatStore((s) => s.getChatSession({ mode: "task", taskId: task.id }));
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);

  const messages = session?.messages ?? [];

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark read on mount
  useEffect(() => {
    if (session) markRead(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const handleSend = async (content: string) => {
    if (!task.assignedAgentId) return;
    setSending(true);
    setInput("");
    await sendMessage({
      mode: "task",
      taskId: task.id,
      agentId: task.assignedAgentId,
      agentName: task.assignedAgentName ?? task.assignedAgentId,
      projectId: project.id,
      content,
    });
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      {/* Paused banner */}
      {task.status === "paused" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-warm-soft border border-warm/15 px-3 py-2">
          <span className="text-warm text-sm">&#9208;</span>
          <span className="text-sm text-warm">Task paused — agent is responding</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-xs text-foreground-muted italic mt-8">
            Send a message to {task.assignedAgentName ?? "the agent"}
          </p>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 border-t border-line pt-3">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder={task.assignedAgentId ? `Message ${task.assignedAgentName ?? "agent"}...` : "Assign an agent first"}
          disabled={!task.assignedAgentId}
          sending={sending}
        />
      </div>
    </div>
  );
}
