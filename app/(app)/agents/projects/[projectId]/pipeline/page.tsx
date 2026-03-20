"use client";

import { useParams } from "next/navigation";
import { useProjectPipelines } from "@/lib/mc/projects-store";
import { PipelineStepCard } from "@/components/mc/projects/PipelineStepCard";

export default function PipelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pipelines = useProjectPipelines(projectId);

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm mb-2">No pipelines configured</p>
        <p className="text-foreground-muted text-xs">
          Pipelines allow you to orchestrate multi-step agent workflows.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pipelines.map((pipeline) => (
        <div key={pipeline.id} className="space-y-4">
          {/* Pipeline header */}
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-base font-semibold tracking-[-0.03em] text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {pipeline.name}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="mono text-xs text-foreground-muted">
                  {pipeline.steps.length} steps
                </span>
                <span className="mono text-xs text-foreground-muted">
                  {pipeline.runCount} runs
                </span>
                <span
                  className={`mono text-xs font-semibold uppercase ${
                    pipeline.status === "running"
                      ? "text-accent"
                      : pipeline.status === "failed"
                      ? "text-danger"
                      : pipeline.status === "success"
                      ? "text-foreground-soft"
                      : "text-foreground-muted"
                  }`}
                  style={{ letterSpacing: "0.06em" }}
                >
                  {pipeline.status}
                </span>
              </div>
            </div>
            <span className="rounded-md bg-surface-strong border border-line-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted uppercase">
              {pipeline.trigger.type}
            </span>
          </div>

          {/* Pipeline steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pipeline.steps.map((step, i) => (
              <PipelineStepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
