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
      className="relative rounded-lg border border-line bg-surface p-5 transition-all duration-300"
      style={{
        borderLeftColor: borderColor,
        borderLeftWidth: "3px",
        opacity: agent.status === "offline" ? 0.5 : 1,
        boxShadow: glow,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={agent.status} size={9} pulse />
          <div>
            <h3
              className="text-base font-semibold tracking-[-0.03em] text-foreground leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {agent.name}
            </h3>
            <p
              className="mono text-[0.65rem] uppercase text-foreground-muted mt-0.5"
              style={{ letterSpacing: "0.18em" }}
            >
              {agent.role}
            </p>
            {agent.model && (
              <p className="mono text-[0.6rem] text-foreground-muted mt-0.5 truncate max-w-[160px]" title={agent.model}>
                {agent.model}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AgentStatusBadge status={agent.status} />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center w-7 h-7 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
              aria-label="Agent actions menu"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 rounded-lg border border-line bg-surface shadow-xl min-w-[160px] py-1">
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
        <div className="mb-3 rounded-md bg-surface-muted border border-line px-3 py-2">
          <p className="text-xs text-foreground-soft leading-snug line-clamp-2">
            {agent.currentTask}
          </p>
        </div>
      )}

      {/* Metrics row */}
      <div className="flex items-center gap-4 mb-3 text-xs text-foreground-muted">
        <span>
          <span className="text-foreground font-medium metric-number">{agent.sessionCountToday}</span>{" "}
          sessions today
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

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Heartbeat */}
        {agent.heartbeat ? (
          <div className="flex items-center gap-1.5">
            {agent.heartbeat.failures >= 3 ? (
              <AlertTriangle size={12} className="text-warning" />
            ) : (
              <Heart size={12} className="text-danger animate-heartbeat" />
            )}
            <span className="text-xs text-foreground-muted">
              {formatRelativeTime(agent.heartbeat.lastSuccessAt)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-foreground-muted">No heartbeat</span>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">
            {formatRelativeTime(agent.lastActivityAt)}
          </span>
          <Link
            href={`/agents/${agent.id}`}
            className="text-xs text-accent hover:text-accent-deep font-medium transition-colors"
          >
            Details →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
