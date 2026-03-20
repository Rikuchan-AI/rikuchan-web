"use client";

import type { PipelineStep, StepStatus, StepExecution } from "@/lib/mc/types-project";
import { formatDuration } from "@/lib/mc/mc-utils";

const statusColor: Record<StepStatus, string> = {
  pending: "var(--step-pending)",
  running: "var(--step-running)",
  success: "var(--step-success)",
  failed:  "var(--step-failed)",
  skipped: "var(--step-skipped)",
};

const executionConfig: Record<StepExecution, { label: string; className: string }> = {
  sequential: { label: "Sequential", className: "bg-accent-soft text-accent" },
  parallel:   { label: "Parallel",   className: "bg-warm-soft text-warm" },
};

interface PipelineStepCardProps {
  step: PipelineStep;
  index: number;
}

export function PipelineStepCard({ step, index }: PipelineStepCardProps) {
  const dotColor = statusColor[step.status];
  const exec = executionConfig[step.executionType];
  const isRunning = step.status === "running";
  const isFailed = step.status === "failed";
  const isCompleted = step.status === "success";

  const duration =
    isCompleted && step.startedAt && step.completedAt
      ? formatDuration(step.completedAt - step.startedAt)
      : null;

  return (
    <div className="rounded-lg border border-line bg-surface p-4 transition-all duration-200">
      {/* Top row: step number + label + status dot */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span
            className="mono text-xs text-accent font-semibold"
            style={{ letterSpacing: "0.08em" }}
          >
            #{index + 1}
          </span>
          <span className="text-sm font-medium text-foreground">{step.label}</span>
        </div>

        {/* Status dot */}
        <span className="relative inline-flex" style={{ width: 8, height: 8 }}>
          {isRunning && (
            <span
              className="absolute inset-0 rounded-full animate-live-pulse"
              style={{ backgroundColor: dotColor }}
            />
          )}
          <span
            className="relative rounded-full block"
            style={{ width: 8, height: 8, backgroundColor: dotColor }}
          />
        </span>
      </div>

      {/* Badges row: role + execution type */}
      <div className="flex items-center gap-2 mb-3">
        <span className="rounded-md bg-surface-strong border border-line-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted uppercase tracking-[0.08em]">
          {step.agentRole}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] ${exec.className}`}
        >
          {exec.label}
        </span>
      </div>

      {/* Status detail */}
      {isRunning && (
        <p className="text-xs text-accent animate-heartbeat">running...</p>
      )}
      {isCompleted && duration && (
        <p className="mono text-xs text-foreground-muted">
          Completed in {duration}
        </p>
      )}
      {isFailed && step.output && (
        <p className="text-xs text-danger line-clamp-2">{step.output}</p>
      )}
    </div>
  );
}
