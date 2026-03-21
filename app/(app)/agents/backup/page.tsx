"use client";

import { useState } from "react";
import {
  Download, Upload, AlertTriangle, Check, Database,
} from "lucide-react";
import { useProjectsStore } from "@/lib/mc/projects-store";

export default function BackupPage() {
  const groups = useProjectsStore((s) => s.groups);
  const projects = useProjectsStore((s) => s.projects);
  const tasks = useProjectsStore((s) => s.tasks);
  const pipelines = useProjectsStore((s) => s.pipelines);
  const memoryDocs = useProjectsStore((s) => s.memoryDocs);
  const createGroup = useProjectsStore((s) => s.createGroup);
  const createProject = useProjectsStore((s) => s.createProject);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreData, setRestoreData] = useState<string | null>(null);

  const totalTasks = Object.values(tasks).flat().length;
  const totalDocs = Object.values(memoryDocs).flat().length;

  const handleExport = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      workspace: {
        groups,
        projects,
        tasks,
        pipelines,
        memoryDocs,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rikuchan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setRestoreData(content);
      setConfirmRestore(true);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = "";
  };

  const handleRestore = async () => {
    if (!restoreData) return;
    setImporting(true);
    try {
      const data = JSON.parse(restoreData) as {
        workspace?: {
          groups?: typeof groups;
          projects?: typeof projects;
        };
      };
      if (!data.workspace) throw new Error("Invalid backup format");

      let groupCount = 0, projectCount = 0;
      for (const group of data.workspace.groups ?? []) {
        await createGroup(group);
        groupCount++;
      }
      for (const project of data.workspace.projects ?? []) {
        await createProject(project);
        projectCount++;
      }
      setImportResult({ ok: true, message: `Restored ${groupCount} groups and ${projectCount} projects.` });
    } catch (e) {
      setImportResult({ ok: false, message: `Failed to restore: ${(e as Error).message}` });
    } finally {
      setImporting(false);
      setConfirmRestore(false);
      setRestoreData(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <h1
          className="text-2xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Backup & Restore
        </h1>
      </div>

      {/* Workspace summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Groups",   value: groups.length },
          { label: "Projects", value: projects.length },
          { label: "Tasks",    value: totalTasks },
          { label: "Docs",     value: totalDocs },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-4">
            <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.18em" }}>{label}</p>
            <p className="text-xl font-semibold text-foreground metric-number">{value}</p>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-foreground-muted" />
          <h3 className="text-sm font-semibold text-foreground">Export Workspace</h3>
        </div>
        <p className="text-sm text-foreground-muted">
          Download a complete JSON backup of all groups, projects, tasks, pipelines, and memory documents.
          Agent workspace files (SOUL.md, etc.) are stored on the gateway filesystem and are not included.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <Download size={15} />
          Download Backup
        </button>
      </div>

      {/* Import */}
      <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload size={15} className="text-foreground-muted" />
          <h3 className="text-sm font-semibold text-foreground">Restore from Backup</h3>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warm-soft px-4 py-3">
          <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-warning">
            Restoring will ADD the backup data to your current workspace. Existing data is not deleted.
            Duplicate IDs may cause conflicts.
          </p>
        </div>

        {confirmRestore ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground-muted">
              Ready to restore. This will import groups and projects from the backup file.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestore}
                disabled={importing}
                className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
              >
                {importing ? "Restoring..." : "Confirm Restore"}
              </button>
              <button
                onClick={() => { setConfirmRestore(false); setRestoreData(null); }}
                className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <label className="flex items-center gap-2 w-fit cursor-pointer h-10 px-4 rounded-lg border border-line bg-surface-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:border-accent/30 transition-colors">
            <Upload size={15} />
            Select Backup File
            <input type="file" accept=".json" onChange={handleFileSelect} className="sr-only" />
          </label>
        )}

        {importResult && (
          <div className={`flex items-center gap-2 rounded-md border px-4 py-3 ${
            importResult.ok
              ? "border-success/20 bg-success/5 text-success"
              : "border-danger/20 bg-danger/5 text-danger"
          }`}>
            {importResult.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
            <p className="text-xs">{importResult.message}</p>
          </div>
        )}
      </div>

      {/* Note about agent files */}
      <div className="rounded-lg border border-line bg-surface-strong p-4">
        <p className="text-xs text-foreground-muted leading-relaxed">
          <strong className="text-foreground">Agent workspace files</strong> (SOUL.md, AGENTS.md, etc.) are stored on the gateway filesystem.
          Export individual agents via Agent Detail → Export button, or use the gateway's own backup mechanism for filesystem backups.
        </p>
      </div>
    </div>
  );
}
