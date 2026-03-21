"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { Agent } from "@/lib/mc/types";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { StatusDot } from "@/components/mc/ui/StatusDot";
import { formatRelativeTime } from "@/lib/mc/mc-utils";

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
                  href={`/sessions?agent=${agent.id}`}
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
          href={`/sessions?agent=${agent.id}`}
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
    </motion.div>
  );
}
