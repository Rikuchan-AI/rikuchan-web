"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDirectChatStore } from "@/lib/mc/direct-chat-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatListPage() {
  const conversations = useDirectChatStore((s) => s.conversations);
  const createConversation = useDirectChatStore((s) => s.createConversation);
  const deleteConversation = useDirectChatStore((s) => s.deleteConversation);
  const hydrate = useDirectChatStore((s) => s._hydrate);
  const agents = useGatewayStore((s) => s.agents);
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoCreated = useRef(false);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-create conversation when arriving from agent card with ?agent=
  useEffect(() => {
    if (autoCreated.current) return;
    const agentParam = searchParams.get("agent");
    if (!agentParam) return;
    autoCreated.current = true;
    const agent = agents.find((a) => a.id === agentParam);
    const model = agent?.model;
    const id = createConversation(model, agentParam, agent?.name);
    router.replace(`/agents/chat/${id}`);
  }, [searchParams, agents, createConversation, router]);

  const handleNew = () => {
    const id = createConversation();
    router.push(`/agents/chat/${id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
          Chat
        </h2>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-deep"
        >
          <Plus size={14} />
          New conversation
        </button>
      </div>

      <p className="text-sm text-foreground-muted">
        Ask questions directly to the gateway. Conversations are saved locally.
      </p>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={24} />}
          title="No conversations yet"
          description="Ask questions directly to the gateway. Conversations are saved locally."
          primaryAction={{ label: "Start a conversation", onClick: handleNew }}
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/agents/chat/${conv.id}`)}
              className="group flex w-full items-center justify-between rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-accent/30 hover:bg-surface-strong"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {conv.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {conv.agentName && (
                    <>
                      <span className="rounded bg-accent/10 border border-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        {conv.agentName}
                      </span>
                      <span className="text-foreground-muted">·</span>
                    </>
                  )}
                  <span className="mono text-[10px] text-foreground-muted">
                    {conv.model}
                  </span>
                  <span className="text-foreground-muted">·</span>
                  <span className="mono text-[10px] text-foreground-muted">
                    {conv.messages.length} msg{conv.messages.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-foreground-muted">·</span>
                  <span className="mono text-[10px] text-foreground-muted">
                    {formatDate(conv.updatedAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
