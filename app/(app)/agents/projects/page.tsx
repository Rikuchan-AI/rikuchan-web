"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderPlus } from "lucide-react";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { ProjectCard } from "@/components/mc/projects/ProjectCard";
import type { BoardGroup } from "@/lib/mc/types-project";

export default function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);
  const groups = useProjectsStore((s) => s.groups);
  const hydrate = useProjectsStore((s) => s.hydrate);
  const createGroup = useProjectsStore((s) => s.createGroup);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const group: BoardGroup = {
      id: crypto.randomUUID(),
      name: groupName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createGroup(group);
    setGroupName("");
    setShowGroupForm(false);
  };

  // Separate projects by group
  const ungrouped = projects.filter((p) => !p.groupId || !groups.find((g) => g.id === p.groupId));
  const grouped = groups.map((g) => ({
    group: g,
    projects: projects.filter((p) => p.groupId === g.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Projects
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGroupForm(!showGroupForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line-strong text-xs font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <FolderPlus size={14} />
            New Group
          </button>
          <Link
            href="/agents/projects/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors"
          >
            <Plus size={14} />
            New Project
          </Link>
        </div>
      </div>

      {/* Create group form */}
      {showGroupForm && (
        <form onSubmit={handleCreateGroup} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4">
          <FolderPlus size={16} className="text-foreground-muted flex-shrink-0" />
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="Group name"
            autoFocus
          />
          <button
            type="submit"
            disabled={!groupName.trim()}
            className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setShowGroupForm(false); setGroupName(""); }}
            className="px-3 py-1.5 rounded-md text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </form>
      )}

      {projects.length === 0 && groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-foreground-muted text-sm mb-4">No projects yet</p>
          <Link
            href="/agents/projects/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
          >
            <Plus size={14} />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Grouped projects */}
          {grouped.map(({ group, projects: groupProjects }) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                <span className="text-xs text-foreground-muted">({groupProjects.length})</span>
              </div>
              {groupProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groupProjects.map((project, i) => (
                    <ProjectCard key={project.id} project={project} group={group} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-muted py-4 px-3 rounded-lg border border-dashed border-line">
                  No projects in this group
                </p>
              )}
            </div>
          ))}

          {/* Ungrouped projects */}
          {ungrouped.length > 0 && (
            <div>
              {groups.length > 0 && (
                <h3 className="text-sm font-semibold text-foreground-muted mb-3">Ungrouped</h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {ungrouped.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
