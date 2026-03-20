"use client";

import type { AgentStatus } from "@/lib/mc/types";

const statusColors: Record<AgentStatus, string> = {
  online:   "#34d399",
  idle:     "#fbbf24",
  thinking: "#a78bfa",
  degraded: "#fb923c",
  error:    "#f87171",
  offline:  "#52525b",
};

const statusLabels: Record<AgentStatus, string> = {
  online:   "Online",
  idle:     "Idle",
  thinking: "Thinking",
  degraded: "Degraded",
  error:    "Error",
  offline:  "Offline",
};

interface StatusDotProps {
  status: AgentStatus;
  size?: number;
  pulse?: boolean;
}

export function StatusDot({ status, size = 8, pulse = false }: StatusDotProps) {
  const color = statusColors[status];
  const isPulsing = pulse && (status === "online" || status === "thinking");

  return (
    <span
      className="relative inline-flex"
      style={{ width: size, height: size }}
      aria-label={`Status: ${statusLabels[status]}`}
      role="status"
    >
      {isPulsing && (
        <span
          className="absolute inset-0 rounded-full animate-live-pulse"
          style={{ backgroundColor: color, opacity: 0.4 }}
        />
      )}
      <span
        className="relative rounded-full block"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}
