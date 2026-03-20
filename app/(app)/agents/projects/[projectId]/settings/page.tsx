"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { ProjectStatusBadge } from "@/components/mc/projects/ProjectStatusBadge";
import type { ProjectStatus } from "@/lib/mc/types-project";

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useProjectsStore(selectProjectById(projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm">Project not found</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    await updateProject(projectId, { name, description, status });
    setSaving(false);
  };

  const handleDelete = async () => {
    await deleteProject(projectId);
    router.push("/agents/projects");
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* General settings */}
      <div className="rounded-lg border border-line bg-surface p-5 space-y-4">
        <h3
          className="text-base font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          General
        </h3>

        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors min-h-[80px]"
          />
        </div>

        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Status
          </label>
          <div className="flex items-center gap-3">
            <ProjectStatusBadge status={status} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Workspace Path
          </label>
          <p className="text-sm font-mono text-foreground-soft">{project.workspacePath || "—"}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-danger/30 bg-surface p-5 space-y-4">
        <h3
          className="text-base font-semibold tracking-[-0.03em] text-danger"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Danger Zone
        </h3>
        <p className="text-sm text-foreground-muted">
          Deleting this project will remove all tasks, pipelines, and memory documents. This action cannot be undone.
        </p>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="h-10 px-4 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/80 transition-colors"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="h-10 px-4 rounded-lg border border-danger/30 text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
          >
            Delete Project
          </button>
        )}
      </div>
    </div>
  );
}
