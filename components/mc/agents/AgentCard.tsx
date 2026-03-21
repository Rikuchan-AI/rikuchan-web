"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  MoreVertical,
  ExternalLink,
  StopCircle,
  FileText,
  Settings,
  Heart,
  AlertTriangle,
  MessageSquare,
  Activity,
  Trash2,
} from "lucide-react";
import type { Agent } from "@/lib/mc/types";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { StatusDot } from "@/components/mc/ui/StatusDot";
import { formatRelativeTime } from "@/lib/mc/mc-utils";
import { deleteAgentViaGateway } from "@/lib/mc/agent-files";
import { useGatewayStore } from "@/lib/mc/gateway-store";

const statusBorderColor: Record<string, string> = {
  online:   "#34d399",
  idle:     "#fbbf24",
  thinking: "#a78bfa",
  degraded: "#fb923c",
  error:    "#f87171",
  offline:  "transparent",
};

const statusGlow: Record<string, string | undefined> = {
  online:   "0 0 20px rgba(52,211,153,0.12), 0 0 0 1px rgba(52,211,153,0.15)",
  thinking: "0 0 20px rgba(167,139,250,0.10)",
  degraded: undefined,
  idle:     undefined,
  error:    undefined,
  offline:  undefined,
};

const pulsatingStatuses = new Set(["online", "thinking"]);

export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

interface AgentCardProps {
  agent: Agent;
  index?: number;
}

export function AgentCard({ agent, index = 0 }: AgentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const removeAgent = useGatewayStore((s) => s.removeAgent);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAgentViaGateway(agent.id);
    setDeleting(false);
    if (result.ok) {
      removeAgent(agent.id);
      router.refresh();
    } else {
      setDeleteError(result.error ?? "Failed to delete agent");
    }
  }

  const borderColor = statusBorderColor[agent.status] ?? "transparent";
  const glow = statusGlow[agent.status];

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className="relative rounded-lg bg-surface border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] p-4 card-hover transition-all duration-300"
      style={{
        borderLeftColor: borderColor,
        borderLeftWidth: "3px",
        opacity: agent.status === "offline" ? 0.5 : 1,
        boxShadow: glow,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full shrink-0 ${pulsatingStatuses.has(agent.status) ? "animate-pulse" : ""}`}
            style={{ backgroundColor: statusBorderColor[agent.status] ?? "#71717a" }}
          />
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold tracking-[-0.03em] text-foreground leading-tight truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {agent.name}
            </h3>
            <p
              className="mono text-[0.6rem] uppercase text-foreground-muted mt-0.5"
              style={{ letterSpacing: "0.18em" }}
            >
              {agent.role}
            </p>
            {agent.model && (
              <p className="mono text-[0.55rem] text-foreground-muted mt-0.5 truncate max-w-[160px]" title={agent.model}>
                {agent.model}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AgentStatusBadge status={agent.status} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center w-6 h-6 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
              aria-label="Agent actions menu"
            >
              <MoreVertical size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 rounded-lg border border-line bg-surface shadow-xl min-w-[160px] py-1">
                <Link
                  href={`/agents/sessions?agent=${agent.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <ExternalLink size={13} /> Ver sessões
                </Link>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors w-full text-left">
                  <StopCircle size={13} /> Forçar idle
                </button>
                <Link
                  href={`/gateway?agent=${agent.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <FileText size={13} /> Ver logs
                </Link>
                <Link
                  href={`/agents/${agent.id}?tab=config`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings size={13} /> Configurar
                </Link>
                <div className="my-1 border-t border-line" />
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors w-full text-left"
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                >
                  <Trash2 size={13} /> Deletar agente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div className="mb-2 rounded-md bg-surface-muted border border-line px-2.5 py-1.5">
          <p className="text-[11px] text-foreground-soft leading-snug line-clamp-2">
            {agent.currentTask}
          </p>
        </div>
      )}

      {/* Inline metrics */}
      <div className="flex items-center gap-3 mb-2 text-[11px] text-foreground-muted">
        <span className="flex items-center gap-1">
          <Activity size={10} className="text-foreground-muted" />
          <span className="text-foreground font-medium metric-number">{agent.sessionCountToday}</span>{" "}
          sessions
        </span>
        {agent.avgResponseMs > 0 && (
          <span>
            <span className="text-foreground font-medium metric-number">
              {agent.avgResponseMs >= 1000
                ? `${(agent.avgResponseMs / 1000).toFixed(1)}s`
                : `${agent.avgResponseMs}ms`}
            </span>{" "}
            avg
          </span>
        )}
      </div>

      {/* Heartbeat + last activity */}
      <div className="flex items-center justify-between mb-3 text-[10px] text-foreground-muted">
        {agent.heartbeat ? (
          <div className="flex items-center gap-1">
            {agent.heartbeat.failures >= 3 ? (
              <AlertTriangle size={10} className="text-warning" />
            ) : (
              <Heart size={10} className="text-danger animate-heartbeat" />
            )}
            <span>{formatRelativeTime(agent.heartbeat.lastSuccessAt)}</span>
          </div>
        ) : (
          <span>No heartbeat</span>
        )}
        <span>{formatRelativeTime(agent.lastActivityAt)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.06)] pt-2.5">
        <Link
          href={`/agents/${agent.id}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
        >
          <MessageSquare size={11} />
          Chat
        </Link>
        <Link
          href={`/agents/sessions?agent=${agent.id}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
        >
          <ExternalLink size={11} />
          Sessions
        </Link>
        <div className="flex-1" />
        <Link
          href={`/agents/${agent.id}`}
          className="text-[11px] text-accent hover:text-accent-deep font-medium transition-colors"
        >
          Details →
        </Link>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-surface/95 backdrop-blur-sm border border-danger/30 p-4 gap-3">
          <Trash2 size={20} className="text-danger" />
          <p className="text-sm font-medium text-foreground text-center">Deletar <span className="text-danger">{agent.name}</span>?</p>
          <p className="text-[11px] text-foreground-muted text-center">Essa ação é irreversível. Todos os arquivos e configurações do agente serão removidos.</p>
          {deleteError && (
            <p className="text-[11px] text-danger text-center">{deleteError}</p>
          )}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
              disabled={deleting}
              className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-md bg-danger/10 border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
            >
              {deleting ? "Deletando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
