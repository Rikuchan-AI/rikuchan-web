"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { ProjectCard } from "@/components/mc/projects/ProjectCard";

export default function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects);
  const groups = useProjectsStore((s) => s.groups);
  const hydrate = useProjectsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Projects
        </h2>
        <Link
          href="/agents/projects/new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors"
        >
          <Plus size={14} />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              group={groups.find((g) => g.id === project.groupId)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
