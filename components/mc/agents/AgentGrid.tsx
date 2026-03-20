"use client";

import { motion } from "framer-motion";
import type { Agent } from "@/lib/mc/types";
import { AgentCard } from "./AgentCard";

interface AgentGridProps {
  agents: Agent[];
  limit?: number;
}

export function AgentGrid({ agents, limit }: AgentGridProps) {
  const displayed = limit ? agents.slice(0, limit) : agents;

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm">No agents found</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
      initial="hidden"
      animate="visible"
    >
      {displayed.map((agent, i) => (
        <AgentCard key={agent.id} agent={agent} index={i} />
      ))}
    </motion.div>
  );
}
