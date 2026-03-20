"use client";

import { useState } from "react";
import { FolderPlus, Trash2, Pencil, Radio, ExternalLink, Check, X } from "lucide-react";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { createAgentViaGateway } from "@/lib/mc/agent-files";
import type { BoardGroup } from "@/lib/mc/types-project";

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

function GroupCard({
  group,
  projectCount,
  onDelete,
  onUpdate,
}: {
  group: BoardGroup;
  projectCount: number;
  onDelete: () => void;
  onUpdate: (updates: Partial<BoardGroup>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");

  const handleSave = () => {
    onUpdate({ name: name.trim(), description: description.trim() || undefined });
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm font-semibold text-foreground focus:border-accent/40 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this group owns..."
                rows={2}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm text-foreground focus:border-accent/40 focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="text-accent hover:text-accent-deep"><Check size={14} /></button>
                <button onClick={() => setEditing(false)} className="text-foreground-muted hover:text-foreground"><X size={14} /></button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-foreground truncate">{group.name}</h3>
              {group.description && (
                <p className="mt-1 text-xs text-foreground-muted line-clamp-2">{group.description}</p>
              )}
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setName(group.name); setDescription(group.description ?? ""); setEditing(true); }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-strong hover:text-foreground transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-danger/10 hover:text-danger transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-medium text-foreground-muted border border-line">
          {projectCount} project{projectCount !== 1 ? "s" : ""}
        </span>

        {group.agentId && (
          <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent border border-accent/15">
            agent: {group.agentId.slice(0, 12)}
          </span>
        )}

        {group.gateway?.url && (
          <a
            href={group.gateway.url.replace(/^ws/, "http")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-mono text-foreground-muted border border-line hover:text-foreground hover:border-accent/30 transition-colors"
          >
            <Radio size={10} />
            {group.gateway.url}
            <ExternalLink size={8} />
          </a>
        )}
      </div>

      <div className="mono text-[10px] text-foreground-muted/50">
        Created {new Date(group.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const groups = useProjectsStore((s) => s.groups);
  const projects = useProjectsStore((s) => s.projects);
  const createGroup = useProjectsStore((s) => s.createGroup);
  const updateGroup = useProjectsStore((s) => s.updateGroup);
  const deleteGroup = useProjectsStore((s) => s.deleteGroup);
  const isConnected = useGatewayStore((s) => s.status === "connected");
  const stateDir = useGatewayStore((s) => s.stateDir);

  const [draftGroup, setDraftGroup] = useState<BoardGroup | null>(null);
  const [saving, setSaving] = useState(false);

  // Collect unique gateways from existing groups for reuse dropdown
  const savedGateways = groups
    .filter((g) => g.gateway?.url)
    .map((g) => ({ url: g.gateway!.url, token: g.gateway!.token, groupName: g.name }));

  const handleCreate = async () => {
    if (!draftGroup?.name.trim()) return;
    setSaving(true);

    const group: BoardGroup = {
      ...draftGroup,
      name: draftGroup.name.trim(),
      description: draftGroup.description?.trim(),
      gateway: draftGroup.gateway?.url?.trim()
        ? { url: draftGroup.gateway.url.trim(), token: draftGroup.gateway.token?.trim() }
        : undefined,
    };
    await createGroup(group);

    // Try to auto-create agent in gateway (best-effort, non-blocking)
    if (isConnected) {
      try {
        const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "default";
        const workspaceBase = stateDir ? stateDir.replace(/\/?$/, "") : "/data";
        const result = await createAgentViaGateway({
          name: group.name,
          workspace: `${workspaceBase}/workspace/${slug}`,
        });
        if (result.ok && result.agentId) {
          await updateGroup(group.id, { agentId: result.agentId });
        }
      } catch {
        // Agent creation is optional — group is already saved
      }
    }

    setDraftGroup(null);
    setSaving(false);
  };

  const handleSelectGateway = (url: string, token?: string) => {
    if (!draftGroup) return;
    setDraftGroup({
      ...draftGroup,
      gateway: { url, token: token ?? "" },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Groups
          </h1>
          <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-accent-soft text-accent border border-accent/15">
            {groups.length}
          </span>
        </div>
        <button
          onClick={() => setDraftGroup(emptyGroup())}
          className="flex items-center gap-2 h-11 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <FolderPlus size={16} />
          New Group
        </button>
      </div>

      {/* Create form */}
      {draftGroup && (
        <div className="rounded-xl border border-accent/20 bg-surface p-5 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_auto] gap-3">
            <input
              type="text"
              autoFocus
              value={draftGroup.name}
              onChange={(e) => setDraftGroup({ ...draftGroup, name: e.target.value })}
              placeholder="Group name"
              className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
              onKeyDown={(e) => { if (e.key === "Enter" && draftGroup.name.trim()) handleCreate(); }}
            />
            <div className="relative">
              <input
                type="text"
                value={draftGroup.gateway?.url ?? ""}
                onChange={(e) => setDraftGroup({
                  ...draftGroup,
                  gateway: { url: e.target.value, token: draftGroup.gateway?.token ?? "" },
                })}
                placeholder="ws://gateway:18789"
                list="saved-gateways"
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50"
              />
              {savedGateways.length > 0 && (
                <datalist id="saved-gateways">
                  {savedGateways.map((gw) => (
                    <option key={`${gw.url}-${gw.groupName}`} value={gw.url}>
                      {gw.groupName}
                    </option>
                  ))}
                </datalist>
              )}
            </div>
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
                onClick={handleCreate}
                disabled={saving || !draftGroup.name.trim()}
                className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Save"}
              </button>
            </div>
          </div>

          {/* Saved gateways quick-select */}
          {savedGateways.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-foreground-muted uppercase tracking-wider">Saved gateways:</span>
              {savedGateways.map((gw) => (
                <button
                  key={`${gw.url}-${gw.groupName}`}
                  onClick={() => handleSelectGateway(gw.url, gw.token)}
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
      )}

      {/* Groups list */}
      {groups.length === 0 && !draftGroup ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
            <FolderPlus size={20} className="text-foreground-muted" />
          </div>
          <p className="mt-4 text-sm text-foreground-muted">No groups yet</p>
          <p className="mt-1 text-xs text-foreground-muted/60">
            Groups organize projects and can have their own gateway connection.
          </p>
          <button
            onClick={() => setDraftGroup(emptyGroup())}
            className="mt-3 text-sm font-medium text-accent hover:text-accent-deep transition-colors"
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              projectCount={projects.filter((p) => p.groupId === group.id).length}
              onDelete={() => deleteGroup(group.id)}
              onUpdate={(updates) => updateGroup(group.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
