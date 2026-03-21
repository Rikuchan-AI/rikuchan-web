"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { motion } from "framer-motion";
import type { BoardGroup, Project } from "@/lib/mc/types-project";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

interface ProjectCardProps {
  project: Project;
  group?: BoardGroup;
  index?: number;
}

export function ProjectCard({ project, group, index = 0 }: ProjectCardProps) {
  const { taskCount, roster } = project;
  const visibleRoster = roster.slice(0, 3);
  const extraCount = roster.length - 3;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <Link
        href={`/agents/projects/${project.id}`}
        className="block rounded-lg border border-line bg-surface p-5 glow-card card-hover transition-all duration-300"
      >
        {/* Header: status badge + name */}
        <div className="flex items-center justify-between mb-2">
          <ProjectStatusBadge status={project.status} />
          {group?.gateway?.url && (
            <span className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-[0.65rem] font-medium text-foreground-muted">
              <Radio size={10} />
              Group Gateway
            </span>
          )}
        </div>

        <h3
          className="text-base font-semibold tracking-[-0.03em] text-foreground leading-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {project.name}
        </h3>

        <p className="text-sm text-foreground-soft leading-snug line-clamp-2 mb-2">
          {project.description}
        </p>

        {group && (
          <p className="text-xs text-accent mb-2">
            {group.name}
          </p>
        )}

        {/* Metric row */}
        <div className="flex items-center gap-3 mb-4 text-xs text-foreground-muted">
          <MetricPill label="BKL" value={taskCount.backlog} color="var(--task-backlog)" />
          <MetricPill label="PRG" value={taskCount.progress} color="var(--task-progress)" />
          <MetricPill label="REV" value={taskCount.review} color="var(--task-review)" />
          {(taskCount.blocked ?? 0) > 0 && (
            <MetricPill label="BLK" value={taskCount.blocked!} color="var(--danger)" />
          )}
          <MetricPill label="DNE" value={taskCount.done} color="var(--task-done)" />
        </div>

        {/* Roster avatars */}
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {visibleRoster.map((member) => {
              const initials = member.agentName
                .split(/[\s-]+/)
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <span
                  key={member.agentId}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-accent-foreground text-[0.6rem] font-bold border-2 border-surface"
                  title={member.agentName}
                >
                  {initials}
                </span>
              );
            })}
          </div>
          {extraCount > 0 && (
            <span className="ml-2 text-xs text-foreground-muted">
              +{extraCount}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* Small metric pill used inside ProjectCard */
function MetricPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="metric-number text-foreground font-medium">{value}</span>
      <span
        className="mono text-[0.6rem] uppercase"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </span>
    </span>
  );
}
