"use client";

import { useState } from "react";
import {
  FolderPlus, Trash2, Pencil, Radio, ExternalLink,
  Check, X, ChevronDown, ChevronRight, Layers,
} from "lucide-react";
import Link from "next/link";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { ActionOverlay } from "@/components/shared/action-overlay";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { createAgentViaGateway } from "@/lib/mc/agent-files";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectStatusBadge } from "@/components/mc/projects/ProjectStatusBadge";
import type { BoardGroup } from "@/lib/mc/types-project";
import { GROUP_COLORS, colorFromName } from "@/lib/mc/types-project";

// ─── Color dot ───────────────────────────────────────────────────────────────

function colorTw(color: string | undefined): string {
  const found = GROUP_COLORS.find((c) => c.value === color);
  return found?.tw ?? "bg-zinc-500";
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {GROUP_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={`w-5 h-5 rounded-full transition-all ${c.tw} ${
            value === c.value
              ? "ring-2 ring-offset-2 ring-offset-surface ring-foreground/40 scale-110"
              : "opacity-60 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Emoji picker (simple) ───────────────────────────────────────────────────

const ICON_EMOJIS = ["🗂", "⚙️", "🔬", "🚀", "🛠", "🤖", "🔒", "📊", "🌐", "💡", "🎯", "🏗"];

function EmojiPicker({
  value,
  name,
  onChange,
}: {
  value: string | undefined;
  name: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = value || name.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-strong text-base hover:border-accent/40 transition-colors"
      >
        {display}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="grid grid-cols-6 gap-1">
            {ICON_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-surface-strong transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  groupProjects,
  onDelete,
  onUpdate,
}: {
  group: BoardGroup;
  groupProjects: ReturnType<typeof useProjectsStore.getState>["projects"];
  onDelete: () => Promise<void>;
  onUpdate: (updates: Partial<BoardGroup>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [icon, setIcon] = useState(group.icon ?? "");
  const [color, setColor] = useState(group.color ?? colorFromName(group.name));

  const handleSave = () => {
    onUpdate({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon || undefined,
      color,
    });
    setEditing(false);
  };

  const dot = colorTw(group.color ?? colorFromName(group.name));
  const iconDisplay = group.icon || group.name.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative rounded-xl border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Color bar */}
            <div className={`w-1 self-stretch rounded-full shrink-0 ${dot}`} />

            {/* Icon */}
            <span className="text-lg shrink-0">{iconDisplay}</span>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <EmojiPicker value={icon} name={name} onChange={setIcon} />
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm font-semibold text-foreground focus:border-accent/40 focus:outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                    />
                  </div>
                  <ColorPicker value={color} onChange={(v) => setColor(v as typeof color)} />
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
                    <p className="mt-0.5 text-xs text-foreground-muted line-clamp-2">{group.description}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {!editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  setName(group.name);
                  setDescription(group.description ?? "");
                  setIcon(group.icon ?? "");
                  setColor(group.color ?? colorFromName(group.name));
                  setEditing(true);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-strong hover:text-foreground transition-colors"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted hover:bg-danger/10 hover:text-danger transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md bg-surface-strong px-2 py-0.5 text-[10px] font-medium text-foreground-muted border border-line hover:border-accent/30 hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {groupProjects.length} project{groupProjects.length !== 1 ? "s" : ""}
          </button>

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

      {/* Expanded project list */}
      {expanded && (
        <div className="border-t border-line bg-surface-strong/50 divide-y divide-line">
          {groupProjects.length === 0 ? (
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-foreground-muted">No projects in this group</span>
              <Link
                href={`/agents/projects/new?groupId=${group.id}`}
                className="text-xs text-accent hover:text-accent-deep"
              >
                + New project
              </Link>
            </div>
          ) : (
            <>
              {groupProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/agents/projects/${p.id}`}
                  className="flex items-center justify-between px-5 py-2.5 hover:bg-surface-strong transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Layers size={11} className="text-foreground-muted shrink-0" />
                    <span className="text-xs text-foreground truncate group-hover:text-accent transition-colors">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-foreground-muted">
                      {(p.taskCount.backlog ?? 0) + (p.taskCount.progress ?? 0) + (p.taskCount.review ?? 0)} active
                    </span>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                </Link>
              ))}
              <div className="px-5 py-2">
                <Link
                  href={`/agents/projects/new?groupId=${group.id}`}
                  className="text-xs text-accent hover:text-accent-deep"
                >
                  + New project
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {confirmDelete && (
        <ActionOverlay
          icon={<Trash2 size={20} />}
          title={<>Deletar <span className="text-danger">{group.name}</span>?</>}
          description="O grupo, seus projetos e o agente associado serão removidos."
          confirmLabel="Deletar"
          loadingLabel="Deletando grupo..."
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

export default function GroupsPage() {
  const groups = useProjectsStore((s) => s.groups);
  const projects = useProjectsStore((s) => s.projects);
  const createGroup = useProjectsStore((s) => s.createGroup);
  const updateGroup = useProjectsStore((s) => s.updateGroup);
  const deleteGroup = useProjectsStore((s) => s.deleteGroup);
  const isConnected = useGatewayStore((s) => s.status === "connected");
  const stateDir = useGatewayStore((s) => s.stateDir);

  const [draftGroup, setDraftGroup] = useState<BoardGroup | null>(null);
  const [draftIcon, setDraftIcon] = useState("");
  const [draftColor, setDraftColor] = useState("emerald");
  const [saving, setSaving] = useState(false);

  const savedGateways = groups
    .filter((g) => g.gateway?.url)
    .map((g) => ({ url: g.gateway!.url, token: g.gateway!.token, groupName: g.name }));

  const handleCreate = async () => {
    if (!draftGroup?.name.trim()) return;
    setSaving(true);

    const resolvedColor = draftColor || colorFromName(draftGroup.name);
    const group: BoardGroup = {
      ...draftGroup,
      name: draftGroup.name.trim(),
      description: draftGroup.description?.trim(),
      icon: draftIcon || undefined,
      color: resolvedColor as BoardGroup["color"],
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
    setDraftIcon("");
    setDraftColor("emerald");
    setSaving(false);
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
          onClick={() => { setDraftGroup(emptyGroup()); setDraftIcon(""); setDraftColor("emerald"); }}
          className="flex items-center gap-2 h-11 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
        >
          <FolderPlus size={16} />
          New Group
        </button>
      </div>

      {/* Create form */}
      {draftGroup && (
        <div className="rounded-xl border border-accent/20 bg-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <EmojiPicker value={draftIcon} name={draftGroup.name} onChange={setDraftIcon} />
            <input
              type="text"
              autoFocus
              value={draftGroup.name}
              onChange={(e) => setDraftGroup({ ...draftGroup, name: e.target.value })}
              placeholder="Group name"
              className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
              onKeyDown={(e) => { if (e.key === "Enter" && draftGroup.name.trim()) handleCreate(); }}
            />
          </div>

          <ColorPicker value={draftColor} onChange={setDraftColor} />

          <textarea
            value={draftGroup.description ?? ""}
            onChange={(e) => setDraftGroup({ ...draftGroup, description: e.target.value })}
            placeholder="What this group owns..."
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 min-h-[64px] resize-none"
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3">
            <div className="relative">
              <input
                type="text"
                value={draftGroup.gateway?.url ?? ""}
                onChange={(e) => setDraftGroup({ ...draftGroup, gateway: { url: e.target.value, token: draftGroup.gateway?.token ?? "" } })}
                placeholder="ws://gateway:18789 (optional)"
                list="saved-gateways"
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50"
              />
              {savedGateways.length > 0 && (
                <datalist id="saved-gateways">
                  {savedGateways.map((gw) => (
                    <option key={`${gw.url}-${gw.groupName}`} value={gw.url}>{gw.groupName}</option>
                  ))}
                </datalist>
              )}
            </div>
            <input
              type="password"
              value={draftGroup.gateway?.token ?? ""}
              onChange={(e) => setDraftGroup({ ...draftGroup, gateway: { url: draftGroup.gateway?.url ?? "", token: e.target.value } })}
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

          {savedGateways.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-foreground-muted uppercase tracking-wider">Saved gateways:</span>
              {savedGateways.map((gw) => (
                <button
                  key={`${gw.url}-${gw.groupName}`}
                  onClick={() => setDraftGroup({ ...draftGroup, gateway: { url: gw.url, token: gw.token ?? "" } })}
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
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 && !draftGroup ? (
        <EmptyState
          icon={<FolderPlus size={24} />}
          title="No groups yet"
          description="Groups organize projects and can have their own gateway connection."
          primaryAction={{ label: "Create your first group", onClick: () => { setDraftGroup(emptyGroup()); } }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              groupProjects={projects.filter((p) => p.groupId === group.id)}
              onDelete={() => deleteGroup(group.id)}
              onUpdate={(updates) => updateGroup(group.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
