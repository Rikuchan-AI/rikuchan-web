"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { useDirectChatStore } from "@/lib/mc/direct-chat-store";
import { ArrowLeft, Send, Pencil, Check, X, BookOpen, Copy, ChevronDown } from "lucide-react";
import type { DirectChatMessage, GatewayMeta } from "@/lib/mc/direct-chat-store";
import { gatewayFetch } from "@/lib/mc/gateway-api";
import { RikuLoader } from "@/components/shared/riku-loader";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function RagBadge({ gateway }: { gateway: GatewayMeta }) {
  if (!gateway.rag) return null;
  const isHit = gateway.rag.startsWith("hit:");
  const chunks = isHit ? gateway.rag.split(":")[1] : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
        isHit
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-foreground-muted/10 text-foreground-muted"
      }`}
    >
      <BookOpen size={10} />
      {isHit ? `RAG ${chunks} chunks` : `RAG ${gateway.rag}`}
    </span>
  );
}

function LatencyBadge({ latencyMs }: { latencyMs: number }) {
  const rounded = Math.round(latencyMs);
  const color =
    rounded < 1000
      ? "text-emerald-400"
      : rounded <= 5000
        ? "text-amber-400"
        : "text-red-400";

  return <span className={`mono text-[10px] ${color}`}>{rounded}ms</span>;
}

function GatewayInfo({ gateway }: { gateway: GatewayMeta }) {
  const parts: string[] = [];
  if (gateway.provider) parts.push(gateway.provider);
  if (gateway.latencyMs) parts.push(`${Math.round(gateway.latencyMs)}ms`);
  if (parts.length === 0) return null;

  return (
    <span className="mono text-[10px] text-foreground-muted/50">
      {parts.join(" · ")}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex h-6 w-6 items-center justify-center rounded text-foreground-muted/40 transition-colors hover:bg-surface-strong hover:text-foreground-muted"
      title="Copy message"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function MessageBubble({ message }: { message: DirectChatMessage }) {
  const isUser = message.role === "user";
  const gw = message.gateway;

  if (isUser) {
    return (
      <div className="group flex flex-col items-end">
        <div className="flex items-start gap-1">
          <CopyButton text={message.content} />
          <div className="max-w-[85%] rounded-lg rounded-br-sm bg-accent px-3 py-2.5 text-sm leading-relaxed text-accent-foreground">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="mono text-[10px] text-foreground-muted">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-start">
      <div className="max-w-[85%] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)] bg-zinc-800/60">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] bg-zinc-800/80 px-3 py-1.5">
          {message.model && (
            <span className="mono text-[10px] text-foreground-muted/60">
              {message.model}
              {gw?.actualModel && gw.actualModel !== message.model && (
                <span className="text-foreground-muted/40">{" -> "}{gw.actualModel}</span>
              )}
            </span>
          )}
          {gw && <RagBadge gateway={gw} />}
          {gw?.latencyMs && (
            <span className="ml-auto">
              <LatencyBadge latencyMs={gw.latencyMs} />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-3 py-2.5 text-sm leading-relaxed text-foreground">
          {message.content ? (
            <div className="prose-sm prose-invert max-w-none [&_p]:mb-1 [&_p]:last:mb-0 [&_ul]:ml-3 [&_ul]:list-disc [&_ol]:ml-3 [&_ol]:list-decimal [&_li]:mb-0.5 [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-surface [&_pre]:p-2 [&_pre]:text-xs [&_strong]:font-semibold [&_a]:text-accent [&_a]:underline">
              <Markdown>{message.content}</Markdown>
            </div>
          ) : (
            <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground-muted/50" />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.04)] px-3 py-1.5">
          <span className="mono text-[9px] text-foreground-muted/50">
            {formatTime(message.timestamp)}
          </span>
          {gw?.provider && (
            <span className="mono text-[9px] text-foreground-muted/50">
              {gw.provider}
            </span>
          )}
          <span className="ml-auto">
            <CopyButton text={message.content} />
          </span>
        </div>
      </div>
    </div>
  );
}

interface GatewayModel {
  id: string;
  provider: string;
  tier: string;
  available: boolean;
}

function useAvailableModels() {
  const [models, setModels] = useState<GatewayModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gatewayFetch<{ models: GatewayModel[] }>("/v1/models")
      .then((data) => setModels(data.models.filter((m) => m.available)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { models, loading };
}

function ModelSelector({
  currentModel,
  models,
  loading,
  onChange,
}: {
  currentModel: string;
  models: GatewayModel[];
  loading: boolean;
  onChange: (model: string) => void;
}) {
  if (loading) {
    return <RikuLoader size="sm" />;
  }

  if (models.length === 0) {
    return (
      <span className="mono shrink-0 text-[10px] text-foreground-muted">
        {currentModel}
      </span>
    );
  }

  // Group models by provider
  const grouped = models.reduce<Record<string, GatewayModel[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="relative shrink-0">
      <span className="mono mb-0.5 block text-[9px] uppercase tracking-[0.08em] text-foreground-muted/50">
        Model
      </span>
      <div className="relative">
        <select
          value={currentModel}
          onChange={(e) => onChange(e.target.value)}
          className="mono appearance-none rounded-md border border-line bg-surface-strong py-1.5 pl-2.5 pr-7 text-xs text-foreground-muted transition-colors hover:border-accent/30 hover:text-foreground focus:border-accent/40 focus:outline-none"
        >
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <optgroup key={provider} label={provider}>
              {providerModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted" />
      </div>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  "What models are available?",
  "What providers are connected?",
  "Show my recent usage stats",
  "How does the RAG pipeline work?",
  "Summarize the current system status",
];

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();

  const conversations = useDirectChatStore((s) => s.conversations);
  const conversation = conversations.find((c) => c.id === conversationId);
  const sendMessage = useDirectChatStore((s) => s.sendMessage);
  const renameConversation = useDirectChatStore((s) => s.renameConversation);
  const setConversationModel = useDirectChatStore((s) => s.setConversationModel);
  const sending = useDirectChatStore((s) => s.sending);
  const hydrate = useDirectChatStore((s) => s._hydrate);
  const { models: availableModels, loading: modelsLoading } = useAvailableModels();

  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll on new messages and during streaming
  const lastMsg = conversation?.messages[conversation.messages.length - 1];
  const streamContent = lastMsg?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length, streamContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const handleSend = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || sending || !conversationId) return;
    setInput("");
    await sendMessage(conversationId, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && conversationId) {
      renameConversation(conversationId, editTitle.trim());
    }
    setEditing(false);
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-foreground-muted">Conversation not found</p>
        <button
          onClick={() => router.push("/agents/chat")}
          className="mt-3 text-sm font-medium text-accent hover:text-accent-deep transition-colors"
        >
          Back to conversations
        </button>
      </div>
    );
  }

  const messages = conversation.messages;
  const showSuggestions = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-1 py-3">
        <button
          onClick={() => router.push("/agents/chat")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-strong hover:text-foreground"
        >
          <ArrowLeft size={16} />
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              className="flex-1 rounded-md border border-line bg-surface-strong px-2 py-1 text-sm text-foreground focus:border-accent/40 focus:outline-none"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditing(false); }}
            />
            <button onClick={handleSaveTitle} className="text-accent hover:text-accent-deep">
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)} className="text-foreground-muted hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <h2 className="truncate font-display text-sm font-semibold tracking-[-0.02em] text-foreground">
              {conversation.title}
            </h2>
            <button
              onClick={() => { setEditTitle(conversation.title); setEditing(true); }}
              className="shrink-0 text-foreground-muted hover:text-foreground transition-colors"
            >
              <Pencil size={12} />
            </button>
          </div>
        )}

        <ModelSelector
          currentModel={conversation.model}
          models={availableModels}
          loading={modelsLoading}
          onChange={(model) => setConversationModel(conversationId, model)}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showSuggestions && (
          <div className="mx-auto max-w-lg space-y-4 pt-8">
            <div className="text-center">
              <h3 className="font-display text-lg font-semibold tracking-[-0.03em] text-foreground">
                Ask the Gateway
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Chat directly with your AI gateway. Context from your RAG is automatically injected.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="rounded-lg border border-line bg-surface-strong px-4 py-3 text-left text-sm text-foreground-soft transition-colors hover:border-accent/30 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-line p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none rounded-lg border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent/40 focus:outline-none transition-colors"
            placeholder="Ask the gateway..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 160) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14} className={sending ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
