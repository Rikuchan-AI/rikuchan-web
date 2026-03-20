"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useProjectsStore } from "@/lib/mc/projects-store";
import type { Project } from "@/lib/mc/types-project";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createProject = useProjectsStore((s) => s.createProject);
  const groups = useProjectsStore((s) => s.groups);

  const preselectedGroupId = searchParams.get("groupId") ?? "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workspacePath, setWorkspacePath] = useState("");
  const [groupId, setGroupId] = useState(preselectedGroupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      status: "active",
      workspacePath,
      groupId: groupId || undefined,
      leadAgentModel: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roster: [],
      taskCount: { backlog: 0, progress: 0, review: 0, done: 0 },
      memoryDocCount: 0,
    };
    await createProject(project);
    router.push(`/agents/projects/${project.id}`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/agents/projects"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Projects
      </Link>

      <h2
        className="text-xl font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Create New Project
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="e.g. my-project"
            required
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
            placeholder="What is this project about?"
          />
        </div>

        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Group
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors appearance-none"
          >
            <option value="">No group (ungrouped)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {groups.length === 0 && (
            <p className="mt-1.5 text-xs text-foreground-muted">
              No groups yet.{" "}
              <Link href="/agents/projects" className="text-accent hover:text-accent-deep">
                Create a group first
              </Link>{" "}
              to organize projects.
            </p>
          )}
        </div>

        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Workspace Path (optional)
          </label>
          <input
            type="text"
            value={workspacePath}
            onChange={(e) => setWorkspacePath(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="Auto-generated if empty"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href="/agents/projects"
            className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors inline-flex items-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!name}
            className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
