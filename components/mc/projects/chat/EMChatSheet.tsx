"use client";

import { useState, useRef, useEffect } from "react";
import { X, Crown } from "lucide-react";
import { ChatBubble, TypingIndicator } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { useChatStore } from "@/lib/mc/chat-store";
// em-chat removed — lead actions executed by backend. Simple display-only parsing kept inline.
function parseActionBlocks(content: string): { type: string; title?: string }[] {
  const regex = /```action\n([\s\S]*?)```/g;
  const actions: { type: string; title?: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      actions.push(parsed);
    } catch { /* skip malformed */ }
  }
  return actions;
}

function stripActionBlocks(content: string): string {
  return content.replace(/```action\n[\s\S]*?```/g, "").trim();
}
import { useProjectsStore, selectProjectById, useProjectTasks } from "@/lib/mc/projects-store";
import { EM_SUGGESTED_PROMPTS } from "@/lib/mc/types-chat";
import type { ChatMessage } from "@/lib/mc/types-chat";

interface EMChatSheetProps {
  projectId: string;
  onClose: () => void;
}

export function EMChatSheet({ projectId, onClose }: EMChatSheetProps) {
  const project = useProjectsStore(selectProjectById(projectId));
  const tasks = useProjectTasks(projectId);

  const session = useChatStore((s) => s.getChatSession({ mode: "em", projectId }));
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const thinkingAgents = useChatStore((s) => s.thinkingAgents);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = session?.messages ?? [];
  const leadAgent = project?.roster.find((m) => m.role === "lead");
  const showSuggestions = messages.length === 0;
  const isThinking = leadAgent ? thinkingAgents.has(leadAgent.agentId) : false;

  // Actions are executed by backend — frontend only displays them

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (session) markRead(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSend = async (content: string) => {
    if (!content || sending || !leadAgent || !project) return;
    setSending(true);
    setInput("");
    await sendMessage({
      mode: "em",
      content,
      agentId: leadAgent.agentId,
      agentName: leadAgent.agentName,
      projectId,
    });
    setSending(false);
  };

  if (!project || !leadAgent) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Lead Agent Chat"
        className="fixed right-0 top-0 bottom-0 z-50 w-[440px] max-w-full bg-surface border-l border-line flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
              <Crown size={14} className="text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{leadAgent.agentName}</p>
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
          {/* Suggested prompts */}
          {showSuggestions && (
            <div className="rounded-lg border border-line bg-surface-muted p-4 space-y-3">
              <p className="text-xs text-foreground-muted font-medium">Suggested prompts:</p>
              <div className="grid grid-cols-1 gap-2">
                {EM_SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left rounded-lg border border-line bg-surface-strong px-3 py-2 text-xs text-foreground-soft hover:border-accent/30 hover:text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            // Strip action blocks from display
            const displayMsg: ChatMessage = msg.role === "agent"
              ? { ...msg, content: stripActionBlocks(msg.content) }
              : msg;

            const actions = msg.role === "agent" ? parseActionBlocks(msg.content) : [];

            return (
              <div key={msg.id}>
                <ChatBubble message={displayMsg} />
                {/* Action chips */}
                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 ml-0">
                    {actions.map((action, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-accent-soft text-accent rounded px-2 py-1 text-xs font-medium"
                      >
                        &#10003; {action.type.replace(/_/g, " ")}
                        {action.title ? `: "${String(action.title)}"` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isThinking && leadAgent && <TypingIndicator agentName={leadAgent.agentName} />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-line p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            placeholder="Direct the team..."
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
