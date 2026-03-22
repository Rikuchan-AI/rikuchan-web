"use client";

import Link from "next/link";

interface LimitExceededDialogProps {
  resource: string;
  limit: number;
  current: number;
  onClose: () => void;
}

const RESOURCE_LABELS: Record<string, string> = {
  max_projects: "active projects",
  max_tasks_per_project: "tasks per project",
  max_api_keys: "API keys",
  max_agents_per_project: "agents per project",
  max_members: "team members",
};

export function LimitExceededDialog({ resource, limit, current, onClose }: LimitExceededDialogProps) {
  const label = RESOURCE_LABELS[resource] || resource;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">Plan limit reached</h2>
        <p className="mt-2 text-sm text-foreground-soft">
          You have reached the maximum of <span className="font-semibold text-foreground">{limit} {label}</span> on
          your current plan ({current}/{limit} used).
        </p>
        <p className="mt-3 text-sm text-foreground-soft">
          Upgrade your plan to increase this limit.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Link
            href="/dashboard/plans"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition"
          >
            View plans
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground-soft hover:bg-surface-strong transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
