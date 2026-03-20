"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderPlus, Plus, Radio, Search } from "lucide-react";

import { useProjectsStore } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { createAgentViaGateway } from "@/lib/mc/agent-files";
import { ProjectCard } from "@/components/mc/projects/ProjectCard";
import type { BoardGroup, ProjectStatus } from "@/lib/mc/types-project";

type Filter = "all" | ProjectStatus;

function emptyGroup(): BoardGroup {
  const now = Date.now();
  return {
    id: `group-${now}-${Math.random().toString(16).slice(2, 6)}`,
    name: "",
    description: "",
    gateway: { url: "", token: "" },
    createdAt: now,
    updatedAt: now,
  };
}

export default function ProjectsPage() {
  const groups = useProjectsStore((s) => s.groups);
  const projects = useProjectsStore((s) => s.projects);
  const createGroup = useProjectsStore((s) => s.createGroup);
  const updateGroup = useProjectsStore((s) => s.updateGroup);
  const isConnected = useGatewayStore((s) => s.status === "connected");
  const stateDir = useGatewayStore((s) => s.stateDir);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [draftGroup, setDraftGroup] = useState<BoardGroup | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);

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

  const handleCreateGroup = async () => {
    if (!draftGroup?.name.trim()) return;

    setSavingGroup(true);
    const group: BoardGroup = {
      ...draftGroup,
      name: draftGroup.name.trim(),
      description: draftGroup.description?.trim(),
      gateway: draftGroup.gateway?.url?.trim()
        ? { url: draftGroup.gateway.url.trim(), token: draftGroup.gateway.token?.trim() }
        : undefined,
    };
    await createGroup(group);

    if (isConnected) {
      const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "default";
      const workspaceBase = stateDir ? stateDir.replace(/\/?$/, "") : "/data";
      const result = await createAgentViaGateway({
        name: group.name,
        workspace: `${workspaceBase}/workspace/${slug}`,
      });
      if (result.ok && result.agentId) {
        await updateGroup(group.id, { agentId: result.agentId });
      }
    }

    setDraftGroup(null);
    setSavingGroup(false);
  };

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
          <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-accent-soft text-accent border border-accent/15">
            {groups.length} groups
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDraftGroup(emptyGroup())}
            className="flex items-center gap-2 h-11 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground hover:bg-surface-strong transition-colors"
          >
            <FolderPlus size={16} />
            New Group
          </button>
          {isConnected ? (
            <Link
              href="/agents/projects/new"
              className="flex items-center gap-2 h-11 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
            >
              <Plus size={16} />
              New Project
            </Link>
          ) : (
            <span
              className="flex items-center gap-2 h-11 px-5 rounded-lg bg-surface-strong text-foreground-muted text-sm font-medium cursor-not-allowed"
              title="Connect to gateway first"
            >
              <Plus size={16} />
              New Project
            </span>
          )}
        </div>
      </div>

      {/* Draft group form */}
      {draftGroup && (() => {
        const savedGateways = groups
          .filter((g) => g.gateway?.url)
          .map((g) => ({ url: g.gateway!.url, token: g.gateway!.token, groupName: g.name }));

        return (
          <div className="rounded-xl border border-accent/20 bg-surface p-5 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_auto] gap-3">
              <input
                type="text"
                value={draftGroup.name}
                onChange={(e) => setDraftGroup({ ...draftGroup, name: e.target.value })}
                placeholder="Group name"
                className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && draftGroup.name.trim()) handleCreateGroup(); }}
              />
              <input
                type="text"
                value={draftGroup.gateway?.url ?? ""}
                onChange={(e) => setDraftGroup({
                  ...draftGroup,
                  gateway: { url: e.target.value, token: draftGroup.gateway?.token ?? "" },
                })}
                placeholder="ws://gateway:18789"
                list="saved-gateways-projects"
                className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50"
              />
              {savedGateways.length > 0 && (
                <datalist id="saved-gateways-projects">
                  {savedGateways.map((gw) => (
                    <option key={`${gw.url}-${gw.groupName}`} value={gw.url}>
                      {gw.groupName}
                    </option>
                  ))}
                </datalist>
              )}
              <input
                type="password"
                value={draftGroup.gateway?.token ?? ""}
                onChange={(e) => setDraftGroup({
                  ...draftGroup,
                  gateway: { url: draftGroup.gateway?.url ?? "", token: e.target.value },
                })}
                placeholder="Token (optional)"
                className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDraftGroup(null)}
                  className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={savingGroup || !draftGroup.name.trim()}
                  className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
                >
                  {savingGroup ? "Creating..." : "Save"}
                </button>
              </div>
            </div>

            {savedGateways.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-foreground-muted uppercase tracking-wider">Saved gateways:</span>
                {savedGateways.map((gw) => (
                  <button
                    key={`${gw.url}-${gw.groupName}`}
                    onClick={() => setDraftGroup({
                      ...draftGroup,
                      gateway: { url: gw.url, token: gw.token ?? "" },
                    })}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-mono border transition-colors ${
                      draftGroup.gateway?.url === gw.url
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-line bg-surface-strong text-foreground-muted hover:text-foreground hover:border-accent/20"
                    }`}
                  >
                    <Radio size={10} />
                    {gw.groupName}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={draftGroup.description ?? ""}
              onChange={(e) => setDraftGroup({ ...draftGroup, description: e.target.value })}
              placeholder="What this group owns..."
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 min-h-[72px] resize-none"
            />
          </div>
        );
      })()}

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
              ? isConnected
                ? "No projects yet. Create your first project to get started."
                : "Connect to the gateway to create projects."
              : "No projects match your filters."}
          </p>
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
                {group.gateway?.url && (
                  <Link
                    href={`/agents/gateway?groupId=${group.id}`}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground hover:bg-surface-strong transition-colors"
                  >
                    <Radio size={14} />
                    Open Group Gateway
                  </Link>
                )}
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
                  Projects not assigned to a board group yet.
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
