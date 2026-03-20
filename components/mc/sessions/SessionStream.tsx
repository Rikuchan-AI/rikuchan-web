"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@/lib/mc/types";
import { MessageBubble } from "./MessageBubble";
import { formatDuration } from "@/lib/mc/mc-utils";
import { Copy, PauseCircle, PlayCircle } from "lucide-react";
import { toast } from "@/components/shared/toast";

interface SessionStreamProps {
  session: Session;
}

export function SessionStream({ session }: SessionStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentTime, setCurrentTime] = useState(session.endedAt ?? session.startedAt);
  const duration = formatDuration((session.endedAt ?? currentTime) - session.startedAt);
  const tokensUsedLabel = session.tokensUsed
    ? new Intl.NumberFormat("en-US").format(session.tokensUsed)
    : null;

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.messages, autoScroll]);

  useEffect(() => {
    if (session.endedAt) {
      setCurrentTime(session.endedAt);
      return;
    }

    setCurrentTime(Date.now());
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.endedAt]);

  const copySession = async () => {
    await navigator.clipboard.writeText(JSON.stringify(session, null, 2));
    toast("success", "Session copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-line bg-surface flex-shrink-0">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-foreground">{session.agentName}</span>
          <span className="text-foreground-muted">·</span>
          <span className="mono text-xs text-foreground-muted">{session.id}</span>
          <span className="text-foreground-muted">·</span>
          <span className="text-foreground-soft">{duration}</span>
          {tokensUsedLabel && (
            <>
              <span className="text-foreground-muted">·</span>
              <span className="text-foreground-soft">
                <span className="text-accent font-medium">{tokensUsedLabel}</span> tokens
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {session.status === "completed" && (
            <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-success-soft text-success border border-success/15">
              Completed
            </span>
          )}
          {session.status === "error" && (
            <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-danger-soft text-danger border border-danger/15">
              Error
            </span>
          )}

          <button
            onClick={() => setAutoScroll((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            {autoScroll ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
            {autoScroll ? "Pausar scroll" : "Retomar scroll"}
          </button>

          <button
            onClick={copySession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <Copy size={13} />
            Copiar sessão
          </button>
        </div>
      </div>

      {/* Error cause */}
      {session.errorCause && (
        <div className="px-6 py-3 border-b border-danger/20 bg-danger-soft">
          <p className="text-sm text-danger">
            <span className="font-semibold">Causa do erro:</span> {session.errorCause}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {session.messages.length === 0 ? (
          <p className="text-center text-foreground-muted text-sm py-16">No messages in this session.</p>
        ) : (
          session.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
