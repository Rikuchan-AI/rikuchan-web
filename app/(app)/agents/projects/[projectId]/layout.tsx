"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react";
import {
  useProjectsStore,
  selectProjectById,
} from "@/lib/mc/projects-store";
import { useAuthContext } from "@/lib/mc/auth-provider";

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
  const router = useRouter();
  const project = useProjectsStore(selectProjectById(projectId));
  const hydrate = useProjectsStore((s) => s.hydrate);
  const hydrateProject = useProjectsStore((s) => s.hydrateProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const { ready } = useAuthContext();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Wait for auth adapter to be initialized before hydrating
  useEffect(() => {
    if (!ready) return;
    hydrate();
  }, [hydrate, ready]);

  useEffect(() => {
    if (!ready || !projectId) return;
    hydrateProject(projectId);
  }, [projectId, hydrateProject, ready]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const activeTab = PROJECT_TABS.find((tab) =>
    pathname.endsWith(`/${tab.href}`)
  )?.id ?? "board";

  const handleDelete = async () => {
    setDeleting(true);
    await deleteProject(projectId);
    router.push("/agents/projects");
  };

  return (
    <div className="space-y-6">
      {/* Back + Project name */}
      <div className="flex items-start justify-between gap-4">
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

        {/* Actions menu */}
        <div className="relative mt-8 shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-line bg-surface shadow-lg py-1">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete project
                </button>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <p className="text-xs text-danger font-medium">Delete &ldquo;{project?.name}&rdquo;?</p>
                  <p className="text-[11px] text-foreground-muted">This cannot be undone.</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 rounded-md bg-danger py-1 text-xs font-medium text-white hover:bg-danger/80 transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => { setConfirmDelete(false); setMenuOpen(false); }}
                      className="flex-1 rounded-md border border-line py-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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
