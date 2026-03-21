"use client";

import { useState, useEffect, useRef } from "react";
import { X, MessageSquare } from "lucide-react";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { useChatStore } from "@/lib/mc/chat-store";
import { ChatBubble, TypingIndicator } from "@/components/mc/projects/chat/ChatBubble";
import { ChatInput } from "@/components/mc/projects/chat/ChatInput";
import type { ChatMessage } from "@/lib/mc/types-chat";

interface TeamChatProps {
  projectId: string;
  onClose: () => void;
}

export function TeamChat({ projectId, onClose }: TeamChatProps) {
  const project = useProjectsStore(selectProjectById(projectId));
  const leadAgent = project?.roster.find((m) => m.role === "lead");

  const session = useChatStore((s) =>
    leadAgent ? s.getChatSession({ mode: "direct", projectId, agentId: leadAgent.agentId }) : undefined,
  );
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const thinkingAgents = useChatStore((s) => s.thinkingAgents);
  const isThinking = leadAgent ? thinkingAgents.has(leadAgent.agentId) : false;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = session?.messages ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (session) markRead(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const handleSend = async (content: string) => {
    if (!leadAgent || !project) return;
    setSending(true);
    setInput("");
    await sendMessage({
      mode: "direct",
      content,
      agentId: leadAgent.agentId,
      agentName: leadAgent.agentName,
      projectId,
    });
    setSending(false);
  };

  if (!project) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Team Chat"
        className="fixed right-0 top-0 bottom-0 z-50 w-[440px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
              <MessageSquare size={14} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Team Chat</p>
              <p className="text-xs text-foreground-muted">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-strong">
                <MessageSquare size={20} className="text-foreground-muted" />
              </div>
              <p className="text-sm text-foreground-muted max-w-[260px]">
                Chat with the team. Messages are sent to the lead agent.
              </p>
            </div>
          )}

          {messages.map((msg: ChatMessage) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isThinking && leadAgent && <TypingIndicator agentName={leadAgent.agentName} />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-line p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            placeholder={leadAgent ? `Message ${leadAgent.agentName}...` : "No lead agent assigned"}
            disabled={!leadAgent}
            sending={sending}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
