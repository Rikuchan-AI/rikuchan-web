"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { ProjectCard } from "@/components/mc/projects/ProjectCard";
import type { ProjectStatus } from "@/lib/mc/types-project";

type Filter = "all" | ProjectStatus;

export default function ProjectsPage() {
  const groups = useProjectsStore((s) => s.groups);
  const projects = useProjectsStore((s) => s.projects);
  const isConnected = useGatewayStore((s) => s.status === "connected");

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "archived", label: "Archived" },
  ];

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filter !== "all" && project.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        project.name.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.workspacePath.toLowerCase().includes(q)
      );
    });
  }, [filter, projects, search]);

  const ungroupedProjects = filteredProjects.filter((project) => !project.groupId);
  const groupedSections = groups
    .map((group) => ({
      group,
      projects: filteredProjects.filter((project) => project.groupId === group.id),
    }))
    .filter((section) => section.projects.length > 0);

  const hasGroups = groups.length > 0;
  const canCreateProject = isConnected && hasGroups;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Projects
          </h1>
          <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-surface-strong text-foreground-soft border border-line-strong">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canCreateProject ? (
            <Link
              href="/agents/projects/new"
              className="flex items-center gap-2 h-11 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
            >
              <Plus size={16} />
              New Project
            </Link>
          ) : !isConnected ? (
            <span
              className="flex items-center gap-2 h-11 px-5 rounded-lg bg-surface-strong text-foreground-muted text-sm font-medium cursor-not-allowed"
              title="Connect to gateway first"
            >
              <Plus size={16} />
              New Project
            </span>
          ) : (
            <Link
              href="/agents/groups"
              className="flex items-center gap-2 h-11 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
            >
              <Plus size={16} />
              Create a Group first
            </Link>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-md border border-line bg-surface-strong pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-accent-soft text-accent border border-accent/15"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-12 text-center">
          <p className="text-foreground-muted text-sm">
            {projects.length === 0
              ? !isConnected
                ? "Connect to the gateway to create projects."
                : !hasGroups
                  ? "Create a group first, then add projects to it."
                  : "No projects yet. Create your first project to get started."
              : "No projects match your filters."}
          </p>
          {projects.length === 0 && isConnected && !hasGroups && (
            <Link
              href="/agents/groups"
              className="mt-3 inline-block text-sm font-medium text-accent hover:text-accent-deep transition-colors"
            >
              Go to Groups
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSections.map(({ group, projects: sectionProjects }) => (
            <section key={group.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2
                      className="text-lg font-semibold tracking-[-0.03em] text-foreground"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {group.name}
                    </h2>
                    <span className="rounded-md px-2 py-0.5 text-[0.7rem] font-semibold bg-surface-strong text-foreground-soft border border-line-strong">
                      {sectionProjects.length}
                    </span>
                    {group.agentId && (
                      <span className="rounded-md px-2 py-0.5 text-[0.7rem] font-mono font-semibold bg-accent-soft text-accent border border-accent/15">
                        agent:{group.agentId}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-foreground-muted mt-1">{group.description}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sectionProjects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} group={group} index={index} />
                ))}
              </div>
            </section>
          ))}

          {ungroupedProjects.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2
                  className="text-lg font-semibold tracking-[-0.03em] text-foreground"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ungrouped
                </h2>
                <p className="text-sm text-foreground-muted mt-1">
                  Projects not assigned to a group yet.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ungroupedProjects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
