"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { Agent } from "@/lib/mc/types";
import { AgentCard } from "./AgentCard";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonGrid } from "@/components/shared/skeleton";

interface AgentGridProps {
  agents: Agent[];
  limit?: number;
  loading?: boolean;
}

export function AgentGrid({ agents, limit, loading }: AgentGridProps) {
  const displayed = limit ? agents.slice(0, limit) : agents;

  if (loading && displayed.length === 0) {
    return <SkeletonGrid count={6} />;
  }

  if (displayed.length === 0) {
    return (
      <EmptyState
        icon={<Users size={24} />}
        title="No agents found"
        description="Connect your gateway and agents will appear automatically."
        primaryAction={{ label: "Configure Gateway", href: "/agents/gateway" }}
      />
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
