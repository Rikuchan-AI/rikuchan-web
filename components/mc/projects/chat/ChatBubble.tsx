"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import type { ChatMessage } from "@/lib/mc/types-chat";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ToolCallBlock({ toolCall }: { toolCall: NonNullable<ChatMessage["toolCall"]> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
      >
        <span className="mono">&#9881; {toolCall.name}</span>
        <span className="text-[10px]">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <pre className="mt-2 overflow-x-auto rounded bg-surface p-2 text-[11px] text-foreground-soft leading-relaxed">
          {JSON.stringify(toolCall.input, null, 2)}
          {toolCall.output != null && (
            <>
              {"\n\n// output:\n"}
              {JSON.stringify(toolCall.output, null, 2) as string}
            </>
          )}
        </pre>
      )}
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  if (message.role === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-foreground-muted italic">{message.content}</span>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {!isUser && (
        <span className="mb-1 mono text-[10px] text-foreground-muted uppercase" style={{ letterSpacing: "0.06em" }}>
          agent
        </span>
      )}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-accent-foreground rounded-br-sm"
            : "bg-surface-muted text-foreground border border-line rounded-bl-sm"
        }`}
      >
        {message.toolCall ? (
          <ToolCallBlock toolCall={message.toolCall} />
        ) : isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose-sm prose-invert max-w-none [&_p]:mb-1 [&_p]:last:mb-0 [&_ul]:ml-3 [&_ul]:list-disc [&_ol]:ml-3 [&_ol]:list-decimal [&_li]:mb-0.5 [&_code]:bg-surface [&_code]:rounded [&_code]:px-1 [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-surface [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_strong]:font-semibold [&_a]:text-accent [&_a]:underline">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
      </div>
      <span className="mt-1 mono text-[10px] text-foreground-muted">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}
