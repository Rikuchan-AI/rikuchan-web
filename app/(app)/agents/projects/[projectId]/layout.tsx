"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  useProjectsStore,
  selectProjectById,
} from "@/lib/mc/projects-store";

const PROJECT_TABS = [
  { id: "board",    label: "Board",    href: "board" },
  { id: "pipeline", label: "Pipeline", href: "pipeline" },
  { id: "agents",   label: "Agents",   href: "agents" },
  { id: "memory",   label: "Memory",   href: "memory" },
  { id: "settings", label: "Settings", href: "settings" },
] as const;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const project = useProjectsStore(selectProjectById(projectId));
  const hydrate = useProjectsStore((s) => s.hydrate);
  const hydrateProject = useProjectsStore((s) => s.hydrateProject);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (projectId) {
      hydrateProject(projectId);
    }
  }, [projectId, hydrateProject]);

  const activeTab = PROJECT_TABS.find((tab) =>
    pathname.includes(`/${tab.href}`)
  )?.id ?? "board";

  return (
    <div className="space-y-6">
      {/* Back + Project name */}
      <div>
        <Link
          href="/agents/projects"
          className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Projects
        </Link>
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {project?.name ?? "Loading..."}
        </h2>
        {project?.description && (
          <p className="text-sm text-foreground-soft mt-1">{project.description}</p>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-line">
        {PROJECT_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/agents/projects/${projectId}/${tab.href}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-accent"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        ))}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
