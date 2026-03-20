"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { SessionStream } from "@/components/mc/sessions/SessionStream";

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessions = useGatewayStore((s) => s.sessions);

  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    return (
      <div className="space-y-4">
        <Link
          href="/agents/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Sessions
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-foreground-muted text-sm">Session not found: {sessionId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/agents/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Sessions
      </Link>

      <div className="rounded-lg border border-line bg-surface overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        <SessionStream session={session} />
      </div>
    </div>
  );
}
