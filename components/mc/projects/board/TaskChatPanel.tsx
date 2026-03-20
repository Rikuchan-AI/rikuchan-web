"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { ChatBubble } from "@/components/mc/projects/chat/ChatBubble";
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

  const handleSend = async () => {
    if (!input.trim() || sending || !task.assignedAgentId) return;
    setSending(true);
    await sendMessage({
      mode: "task",
      taskId: task.id,
      agentId: task.assignedAgentId,
      agentName: task.assignedAgentName ?? task.assignedAgentId,
      projectId: project.id,
      content: input.trim(),
    });
    setInput("");
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
      <div className="mt-3 flex gap-2 border-t border-line pt-3">
        <input
          className="flex-1 rounded-lg border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent/40 focus:outline-none transition-colors"
          placeholder={task.assignedAgentId ? `Message ${task.assignedAgentName ?? "agent"}...` : "Assign an agent first"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={!task.assignedAgentId}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || !task.assignedAgentId}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-foreground hover:bg-accent-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
