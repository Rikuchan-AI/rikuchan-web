"use client";

import type { Message } from "@/lib/mc/types";
import { CodeBlock } from "@/components/mc/ui/CodeBlock";
import { formatTimestamp } from "@/lib/mc/mc-utils";
import { User, Bot, Wrench, Terminal } from "lucide-react";

const roleConfig = {
  user: {
    icon: User,
    label: "User",
    className: "bg-surface-strong border-line",
    textClass: "text-foreground",
    iconClass: "text-foreground-soft",
  },
  assistant: {
    icon: Bot,
    label: "Assistant",
    className: "bg-accent-soft border-accent/20",
    textClass: "text-foreground",
    iconClass: "text-accent",
  },
  tool: {
    icon: Wrench,
    label: "Tool",
    className: "bg-surface-muted border-line",
    textClass: "text-foreground-soft",
    iconClass: "text-warm",
  },
  system: {
    icon: Terminal,
    label: "System",
    className: "bg-surface-muted border-line",
    textClass: "text-foreground-muted",
    iconClass: "text-foreground-muted",
  },
};

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const config = roleConfig[message.role];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={13} className={config.iconClass} />
          <span
            className="mono text-xs font-semibold uppercase"
            style={{ letterSpacing: "0.12em", color: "var(--foreground-muted)" }}
          >
            {message.toolName ?? config.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {message.tokens && (
            <span className="mono text-xs text-foreground-muted">{message.tokens} tok</span>
          )}
          <span className="mono text-xs text-foreground-muted">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>

      {/* Content */}
      {message.role === "tool" ? (
        <div className="space-y-2">
          {message.toolInput != null && (
            <>
              <p className="text-xs text-foreground-muted mb-1">Input:</p>
              <CodeBlock
                code={JSON.stringify(message.toolInput, null, 2)}
                language="json"
                maxHeight="120px"
              />
            </>
          )}
          {message.toolOutput != null && (
            <>
              <p className="text-xs text-foreground-muted mb-1 mt-2">Output:</p>
              <CodeBlock
                code={JSON.stringify(message.toolOutput, null, 2)}
                language="json"
                maxHeight="120px"
              />
            </>
          )}
        </div>
      ) : (
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${config.textClass}`}>
          {message.content}
        </p>
      )}
    </div>
  );
}
