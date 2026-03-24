"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Plus,
  Crown, Brain, Wrench, Cpu, Settings2,
  ChevronDown, X, Upload,
} from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import { deduplicateModelOptions } from "@/lib/mc/models";
import JSZip from "jszip";
import Link from "next/link";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { createAgentViaGateway, setAgentFileViaGateway, patchAgentDefaults, listWorkspacesViaGateway } from "@/lib/mc/agent-files";
import type { ExistingWorkspace } from "@/lib/mc/agent-files";
import { InfoTooltip } from "@/components/mc/ui/InfoTooltip";
import {
  generateIdentityMd,
  generateSoulMd,
  generateAgentsMd,
  generateUserMd,
  generateToolsMd,
  generateHeartbeatMd,
  generateBootstrapMd,
} from "@/lib/mc/agent-files";
import { gatewayModelsToGroups } from "@/lib/mc/models";
import { SOUL_TEMPLATES, applyTemplateName } from "@/lib/mc/soul-templates";

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identity", icon: Crown },
  { id: 2, label: "Soul",     icon: Brain },
  { id: 3, label: "Tools",    icon: Wrench },
  { id: 4, label: "Model",    icon: Cpu },
  { id: 5, label: "Defaults", icon: Settings2 },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                step.id < current
                  ? "bg-accent text-accent-foreground"
                  : step.id === current
                  ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
                  : "bg-surface-strong border border-line text-foreground-muted"
              }`}
            >
              {step.id < current ? <Check size={12} /> : step.id}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                step.id === current ? "text-foreground" : "text-foreground-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-2 h-px w-8 sm:w-12 ${step.id < current ? "bg-accent" : "bg-line"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
      {children}{required && <span className="text-danger ml-1">*</span>}
    </label>
  );
}

// ─── Step 1: Identity ────────────────────────────────────────────────────────

const ROLE_CATEGORIES = [
  { label: "Engineering", roles: ["developer", "senior-developer", "tech-lead", "architect", "devops", "sre", "qa", "security", "data-engineer", "ml-engineer", "ai-engineer"] },
  { label: "Product & Design", roles: ["product-manager", "gpm", "designer", "ux-researcher"] },
  { label: "Management", roles: ["engineering-manager", "em", "cto", "vp-engineering"] },
  { label: "Data", roles: ["data-analyst", "bi-analyst", "data-scientist"] },
  { label: "Business", roles: ["marketing", "growth", "crm", "sales", "customer-success", "legal", "compliance", "finance", "hr"] },
  { label: "Operations", roles: ["operations", "it", "infra", "information-systems"] },
  { label: "Other", roles: ["researcher", "documenter", "reviewer", "custom"] },
];

const ROLE_SUGGESTIONS = ROLE_CATEGORIES.flatMap((c) => c.roles);

const EMOJI_OPTIONS = [
  "🤖", "🦾", "🧠", "⚙️", "🔧", "🚀", "🛡", "🎯",
  "🔬", "📊", "💡", "🦊", "🦞", "🐉", "🦅", "🎭",
];

function RoleCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? ROLE_SUGGESTIONS.filter((r) => r.includes(value.toLowerCase()))
    : ROLE_SUGGESTIONS;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="developer, devops, qa, designer..."
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 pr-16 text-sm text-foreground focus:outline-none focus:border-accent/50"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(true); }}
            className="absolute right-9 flex items-center justify-center w-5 h-5 rounded text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 flex items-center justify-center w-6 h-6 rounded text-white/40 hover:text-white transition-colors"
        >
          <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-surface shadow-xl max-h-52 overflow-y-auto py-1">
          {filtered.map((r) => (
            <button
              key={r}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(r); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-surface-strong ${value === r ? "text-accent font-medium" : "text-foreground-soft"}`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StepIdentity({
  name, displayName, role, customRole, emoji, theme, description,
  onChange,
  workspaceMode, onWorkspaceModeChange,
  customWorkspace, onCustomWorkspaceChange,
  selectedWorkspace, onSelectedWorkspaceChange,
  existingWorkspaces,
}: {
  name: string;
  displayName: string;
  role: string;
  customRole: string;
  emoji: string;
  theme: string;
  description: string;
  onChange: (field: string, value: string) => void;
  workspaceMode: "auto" | "existing" | "custom";
  onWorkspaceModeChange: (v: "auto" | "existing" | "custom") => void;
  customWorkspace: string;
  onCustomWorkspaceChange: (v: string) => void;
  selectedWorkspace: string;
  onSelectedWorkspaceChange: (v: string) => void;
  existingWorkspaces: ExistingWorkspace[];
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
        {/* Emoji picker */}
        <div>
          <FieldLabel>Emoji</FieldLabel>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-strong text-xl hover:border-accent/40 transition-colors"
            >
              {emoji || "🤖"}
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-full mt-1 z-20 rounded-xl border border-line bg-surface p-2 shadow-lg">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { onChange("emoji", e); setShowEmojiPicker(false); }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-surface-strong transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <FieldLabel required>Name (identifier)</FieldLabel>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => onChange("name", e.target.value.replace(/\s+/g, "-").toLowerCase())}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50"
            placeholder="my-agent"
          />
          <p className="mt-1 text-[10px] text-foreground-muted">Unique identifier — no spaces</p>
        </div>
      </div>

      <div>
        <FieldLabel>Display Name</FieldLabel>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onChange("displayName", e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
          placeholder="e.g. El Locco"
        />
      </div>

      <div>
        <FieldLabel required>Role</FieldLabel>
        <RoleCombobox value={role} onChange={(v) => onChange("role", v)} />
        <div className="mt-3 space-y-2">
          {ROLE_CATEGORIES.map((cat) => (
            <div key={cat.label} className="flex flex-wrap items-center gap-1.5">
              <span className="mono text-[9px] uppercase tracking-widest text-foreground-muted/50 w-20 shrink-0">{cat.label}</span>
              {cat.roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onChange("role", r)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    role === r
                      ? "bg-accent-soft text-accent border border-accent/20"
                      : "bg-surface-strong text-foreground-muted hover:text-foreground border border-transparent hover:border-line-strong"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Theme</FieldLabel>
        <input
          type="text"
          value={theme}
          onChange={(e) => onChange("theme", e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
          placeholder="e.g. Helpful lobster, Relentless optimizer..."
        />
        <p className="mt-1 text-[10px] text-foreground-muted">Short descriptor of personality</p>
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => onChange("description", e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 min-h-[72px] resize-none"
          placeholder="What does this agent do?"
        />
      </div>

      {/* Workspace */}
      <div>
        <FieldLabel>Workspace</FieldLabel>
        <div className="flex items-center gap-2 mb-2">
          {(["auto", "existing", "custom"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onWorkspaceModeChange(mode)}
              className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                workspaceMode === mode
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-strong border border-line text-foreground-muted hover:text-foreground"
              }`}
            >
              {mode === "auto" ? "Auto" : mode === "existing" ? "Existing" : "Custom"}
            </button>
          ))}
        </div>
        {workspaceMode === "auto" && (
          <p className="text-[10px] text-foreground-muted">
            Workspace will be created automatically based on agent name.
          </p>
        )}
        {workspaceMode === "existing" && (
          <div className="space-y-1.5">
            {existingWorkspaces.length === 0 ? (
              <p className="text-xs text-foreground-muted py-2">No existing workspaces found.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-md border border-line bg-surface-strong">
                {existingWorkspaces.map((w) => (
                  <button
                    key={w.workspace}
                    type="button"
                    onClick={() => onSelectedWorkspaceChange(w.workspace)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                      selectedWorkspace === w.workspace
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-surface border-l-2 border-transparent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{w.agentName}</p>
                      <p className="mono text-[10px] text-foreground-muted truncate">{w.workspace}</p>
                    </div>
                    {selectedWorkspace === w.workspace && <Check size={12} className="text-accent shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-foreground-muted">
              Share a workspace with an existing agent. Both agents will read the same files.
            </p>
          </div>
        )}
        {workspaceMode === "custom" && (
          <div>
            <input
              type="text"
              value={customWorkspace}
              onChange={(e) => onCustomWorkspaceChange(e.target.value)}
              className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50"
              placeholder="/data/.openclaw/workspace/my-workspace"
            />
            <p className="mt-1 text-[10px] text-foreground-muted">
              Absolute path on the OpenClaw host filesystem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Soul & Behavior ─────────────────────────────────────────────────

function SoulEditor({
  name,
  soulMd,
  agentsMd,
  onSoulChange,
  onAgentsChange,
}: {
  name: string;
  soulMd: string;
  agentsMd: string;
  onSoulChange: (v: string) => void;
  onAgentsChange: (v: string) => void;
}) {
  type TabId = "soul" | "agents" | "preview";
  const [tab, setTab] = useState<TabId>("soul");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");

  const applyTemplate = (templateRole: string) => {
    const tmpl = SOUL_TEMPLATES.find((t) => t.role === templateRole);
    if (!tmpl) return;
    onSoulChange(applyTemplateName(tmpl.soulMd, name || "Agent"));
    onAgentsChange(applyTemplateName(tmpl.agentsMd, name || "Agent"));
    setSelectedTemplate(templateRole);
  };

  const wordCount = soulMd.split(/\s+/).filter(Boolean).length;
  const estTokens = Math.ceil(soulMd.length / 4);

  const TABS: { id: TabId; label: string }[] = [
    { id: "soul",    label: "SOUL.md" },
    { id: "agents",  label: "AGENTS.md" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="space-y-4">
      {/* Templates */}
      <div>
        <FieldLabel>Template</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SOUL_TEMPLATES.map((t) => (
            <button
              key={t.role}
              type="button"
              onClick={() => applyTemplate(t.role)}
              className={`h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${
                selectedTemplate === t.role
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line bg-surface-strong text-foreground-muted hover:text-foreground hover:border-accent/20"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-accent text-foreground"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editors */}
      {tab === "soul" && (
        <textarea
          value={soulMd}
          onChange={(e) => onSoulChange(e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-none min-h-[320px]"
          placeholder="# Soul — Agent Name&#10;&#10;## Core Truths&#10;..."
          spellCheck={false}
        />
      )}
      {tab === "agents" && (
        <textarea
          value={agentsMd}
          onChange={(e) => onAgentsChange(e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-none min-h-[320px]"
          placeholder="# Agent Name — Workspace&#10;&#10;## Every Session&#10;..."
          spellCheck={false}
        />
      )}
      {tab === "preview" && (
        <div className="rounded-md border border-line bg-surface-strong p-4 min-h-[320px] space-y-4">
          <div>
            <p className="mono text-[10px] text-foreground-muted uppercase tracking-wider mb-2">SOUL.md ({wordCount} words · ~{estTokens} tokens)</p>
            <pre className="text-xs text-foreground-soft whitespace-pre-wrap font-mono leading-relaxed">{soulMd || "(empty)"}</pre>
          </div>
          <div className="border-t border-line pt-4">
            <p className="mono text-[10px] text-foreground-muted uppercase tracking-wider mb-2">AGENTS.md</p>
            <pre className="text-xs text-foreground-soft whitespace-pre-wrap font-mono leading-relaxed">{agentsMd || "(empty)"}</pre>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
        <span>{wordCount} words</span>
        <span>·</span>
        <span>~{estTokens} tokens</span>
        {estTokens > 2000 && (
          <span className="text-warning">· Exceeds 2k token recommendation</span>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Tools & Memory ───────────────────────────────────────────────────

const TOOL_CHECKLIST = [
  { id: "bash",      label: "bash",           description: "Execute shell commands" },
  { id: "read",      label: "read/write",     description: "Read and write files" },
  { id: "edit",      label: "edit",           description: "Edit existing files" },
  { id: "sessions",  label: "sessions_list",  description: "List active sessions" },
  { id: "spawn",     label: "sessions_spawn", description: "Spawn sub-agents" },
  { id: "browser",   label: "browser",        description: "Navigate the web" },
  { id: "process",   label: "process",        description: "Manage system processes" },
];

function StepTools({
  enabledTools,
  heartbeatMd,
  memoryMd,
  userMd,
  onToolsChange,
  onHeartbeatChange,
  onMemoryChange,
  onUserChange,
}: {
  enabledTools: string[];
  heartbeatMd: string;
  memoryMd: string;
  userMd: string;
  onToolsChange: (v: string[]) => void;
  onHeartbeatChange: (v: string) => void;
  onMemoryChange: (v: string) => void;
  onUserChange: (v: string) => void;
}) {
  type TabId = "tools" | "heartbeat" | "memory" | "user";
  const [tab, setTab] = useState<TabId>("tools");

  const toggleTool = (id: string) => {
    if (enabledTools.includes(id)) {
      onToolsChange(enabledTools.filter((t) => t !== id));
    } else {
      onToolsChange([...enabledTools, id]);
    }
  };

  const TABS: { id: TabId; label: string }[] = [
    { id: "tools",     label: "TOOLS.md" },
    { id: "heartbeat", label: "HEARTBEAT.md" },
    { id: "memory",    label: "MEMORY.md" },
    { id: "user",      label: "USER.md" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-accent text-foreground"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tools" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-line overflow-hidden divide-y divide-line">
            {TOOL_CHECKLIST.map((tool) => (
              <label
                key={tool.id}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                  enabledTools.includes(tool.id) ? "bg-accent-soft/40" : "hover:bg-surface-strong"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      enabledTools.includes(tool.id) ? "border-accent bg-accent" : "border-line-strong"
                    }`}
                    onClick={() => toggleTool(tool.id)}
                  >
                    {enabledTools.includes(tool.id) && <Check size={10} className="text-accent-foreground" />}
                  </div>
                  <div>
                    <span className="text-sm font-mono text-foreground">{tool.label}</span>
                    <span className="ml-3 text-xs text-foreground-muted">{tool.description}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-foreground-muted">
            MCP servers and custom restrictions can be added after agent creation.
          </p>
        </div>
      )}

      {tab === "heartbeat" && (
        <div className="space-y-2">
          <p className="text-xs text-foreground-muted">Periodic background tasks. Use markdown checklist format.</p>
          <textarea
            value={heartbeatMd}
            onChange={(e) => onHeartbeatChange(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-none min-h-[240px]"
            spellCheck={false}
          />
        </div>
      )}

      {tab === "memory" && (
        <div className="space-y-2">
          <p className="text-xs text-foreground-muted">Long-term curated memory. Leave blank to start fresh.</p>
          <textarea
            value={memoryMd}
            onChange={(e) => onMemoryChange(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-none min-h-[240px]"
            placeholder="# Memory&#10;&#10;(leave blank to start fresh)"
            spellCheck={false}
          />
        </div>
      )}

      {tab === "user" && (
        <div className="space-y-2">
          <p className="text-xs text-foreground-muted">Information about the human operator this agent serves.</p>
          <textarea
            value={userMd}
            onChange={(e) => onUserChange(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-3 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-none min-h-[240px]"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Model & Operation ────────────────────────────────────────────────

type IdleAction = "standby" | "pull_backlog" | "assist_others";
type SandboxMode = "host" | "docker";

function StepModel({
  model,
  modelForced,
  modelFallback,
  idleAction,
  maxRetries,
  sandboxMode,
  onChange,
}: {
  model: string;
  modelForced: boolean;
  modelFallback: string;
  idleAction: IdleAction;
  maxRetries: number;
  sandboxMode: SandboxMode;
  onChange: (field: string, value: string | boolean | number) => void;
}) {
  const gatewayModels = useGatewayStore((s) => s.availableModels);
  const modelGroups = gatewayModels;
  const allModels = modelGroups.flatMap((g) => g.models);

  const IDLE_OPTIONS: { value: IdleAction; label: string; description: string }[] = [
    { value: "standby",      label: "Standby",       description: "Wait for tasks to be assigned" },
    { value: "pull_backlog", label: "Pull backlog",  description: "Automatically pick next backlog task by priority" },
    { value: "assist_others", label: "Assist others", description: "Help other agents with their current tasks" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Preferred Model</FieldLabel>
        <Combobox
          value={model}
          onChange={(v) => onChange("model", v)}
          placeholder="Gateway routing (auto)"
          options={deduplicateModelOptions(modelGroups.flatMap((g) =>
            g.models.map((m) => ({ id: m.id, label: m.label + (m.recommended ? " ★" : ""), sub: g.provider }))
          ))}
          mono
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={modelForced}
            onChange={(e) => onChange("modelForced", e.target.checked)}
            className="rounded border-line"
          />
          <span className="text-xs text-foreground-muted">
            Force model — override project and gateway routing
          </span>
        </label>
        {modelForced && (
          <span className="inline-block mt-1 rounded-md bg-warning/10 border border-warning/20 px-1.5 py-0.5 text-[10px] text-warning">
            FORCED — badge appears in all boards
          </span>
        )}
      </div>

      {model && (
        <div>
          <FieldLabel>Fallback Model</FieldLabel>
          <Combobox
            value={modelFallback}
            onChange={(v) => onChange("modelFallback", v)}
            placeholder="None"
            options={deduplicateModelOptions(allModels
              .filter((m) => m.id !== model)
              .map((m) => {
                const group = modelGroups.find((g) => g.models.some((gm) => gm.id === m.id));
                return { id: m.id, label: m.label, sub: group?.provider };
              }))}
            mono
          />
        </div>
      )}

      <div>
        <FieldLabel>When idle</FieldLabel>
        <div className="rounded-lg border border-line overflow-hidden divide-y divide-line">
          {IDLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                idleAction === opt.value ? "bg-accent-soft" : "hover:bg-surface-strong"
              }`}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  idleAction === opt.value ? "border-accent bg-accent" : "border-line-strong"
                }`}
              >
                {idleAction === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />}
              </div>
              <input type="radio" name="idle-action" value={opt.value} checked={idleAction === opt.value} onChange={() => onChange("idleAction", opt.value)} className="sr-only" />
              <div>
                <p className={`text-sm font-medium ${idleAction === opt.value ? "text-accent" : "text-foreground"}`}>{opt.label}</p>
                <p className="text-xs text-foreground-muted mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Max retries</FieldLabel>
          <input
            type="number"
            min={0}
            max={10}
            value={maxRetries}
            onChange={(e) => onChange("maxRetries", Number(e.target.value))}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="mono text-xs uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>Sandbox</label>
            <InfoTooltip text="Host: agente executa ferramentas com acesso direto ao sistema. Docker: execução isolada em container, sem acesso ao host." />
          </div>
          <Combobox
            value={sandboxMode}
            onChange={(v) => onChange("sandboxMode", v)}
            options={[
              { id: "host", label: "Host (full access)" },
              { id: "docker", label: "Docker (sandboxed)" },
            ]}
            placeholder="Select sandbox"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Agent Defaults ──────────────────────────────────────────────────

function FieldWithInfo({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="mono text-xs uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>{label}</label>
        <InfoTooltip text={tooltip} />
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-accent" : "bg-surface-strong border border-line"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function NumberInput({ value, onChange, placeholder, min, max }: {
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      placeholder={placeholder ?? "Default"}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={[
        { id: "", label: "Inherit default" },
        ...options.map((o) => ({ id: o.value, label: o.label })),
      ]}
      placeholder="Inherit default"
    />
  );
}

interface DefaultsState {
  // per-agent
  allowSubagents: string;
  subagentModel: string;
  humanDelayEnabled: boolean;
  // global — behavior
  thinkingDefault: string;
  verboseDefault: string;
  elevatedDefault: string;
  typingMode: string;
  typingIntervalSeconds: number | "";
  // global — block streaming
  blockStreamingDefault: string;
  blockStreamingBreak: string;
  blockStreamingChunk: string;   // JSON
  blockStreamingCoalesce: string; // JSON
  // global — context & bootstrap
  contextTokens: number | "";
  bootstrapMaxChars: number | "";
  bootstrapTotalMaxChars: number | "";
  bootstrapTruncWarning: string;
  skipBootstrap: boolean;
  // global — performance
  maxConcurrent: number | "";
  timeoutSeconds: number | "";
  // global — media
  imageMaxDimension: number | "";
  imageModel: string;           // JSON value e.g. "claude-..."
  mediaMaxMb: number | "";
  pdfMaxSizeMb: number | "";
  pdfMaxPages: number | "";
  pdfModel: string;             // JSON value
  // global — envelope & time
  envelopeTimestamp: string;
  envelopeElapsed: string;
  envelopeTimezone: string;
  userTimezone: string;
  timeFormat: string;
  // global — workspace
  workspace: string;
  repoRoot: string;
  // global — advanced (raw JSON)
  heartbeatJson: string;
  humanDelayJson: string;
  sandboxJson: string;
  compactionJson: string;
  contextPruningJson: string;
  memorySearchJson: string;
  cliBackendsJson: string;
  embeddedPiJson: string;
  modelsJson: string;
}

const EMPTY_DEFAULTS: DefaultsState = {
  allowSubagents: "", subagentModel: "", humanDelayEnabled: false,
  thinkingDefault: "", verboseDefault: "", elevatedDefault: "",
  typingMode: "", typingIntervalSeconds: "",
  blockStreamingDefault: "", blockStreamingBreak: "",
  blockStreamingChunk: "", blockStreamingCoalesce: "",
  contextTokens: "", bootstrapMaxChars: "", bootstrapTotalMaxChars: "",
  bootstrapTruncWarning: "", skipBootstrap: false,
  maxConcurrent: "", timeoutSeconds: "",
  imageMaxDimension: "", imageModel: "", mediaMaxMb: "",
  pdfMaxSizeMb: "", pdfMaxPages: "", pdfModel: "",
  envelopeTimestamp: "", envelopeElapsed: "", envelopeTimezone: "",
  userTimezone: "", timeFormat: "",
  workspace: "", repoRoot: "",
  heartbeatJson: "", humanDelayJson: "", sandboxJson: "",
  compactionJson: "", contextPruningJson: "", memorySearchJson: "",
  cliBackendsJson: "", embeddedPiJson: "", modelsJson: "",
};

function JsonTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-y"
    />
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full py-1"
    >
      <span className="mono text-[10px] uppercase tracking-widest text-foreground-muted font-semibold">{label}</span>
      <span className="text-[10px] text-foreground-muted">{open ? "▲" : "▼"}</span>
    </button>
  );
}

// ─── Shared Combobox ─────────────────────────────────────────────────────────

function SimpleCombobox({
  value, onChange, options, placeholder, mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string; sub?: string }[];
  placeholder?: string;
  mono?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  const filtered = value.trim()
    ? options.filter((o) => o.id.includes(value.toLowerCase()) || o.label.toLowerCase().includes(value.toLowerCase()))
    : options;

  // Reposition portal dropdown on open / scroll / resize
  const reposition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < 220 && rect.top > 220;
    setDropStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const dropdown = open && filtered.length > 0 ? (
    <div style={dropStyle} className="rounded-lg border border-line bg-surface shadow-xl max-h-52 overflow-y-auto py-1">
      {filtered.map((o) => (
        <button key={o.id} type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange(o.id); setOpen(false); }}
          className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-surface-strong ${value === o.id ? "text-accent font-medium" : "text-foreground-soft"}`}>
          <span className={mono ? "font-mono" : ""}>{o.label}</span>
          {o.sub && <span className="ml-2 text-[11px] text-foreground-muted">{o.sub}</span>}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={ref}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); reposition(); }}
          placeholder={placeholder}
          className={`w-full rounded-md border border-line bg-surface-strong px-3 py-2 pr-16 text-sm text-foreground focus:outline-none focus:border-accent/50 ${mono ? "font-mono" : ""}`}
        />
        {value && (
          <button type="button" onClick={() => { onChange(""); setOpen(true); }}
            className="absolute right-9 flex items-center justify-center w-5 h-5 rounded text-foreground-muted hover:text-foreground hover:bg-surface transition-colors">
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
        <button type="button" onClick={() => { setOpen((v) => !v); reposition(); }}
          className="absolute right-2 flex items-center justify-center w-6 h-6 rounded text-white/40 hover:text-white transition-colors">
          <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {typeof window !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

function SubAgentCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const agents = useGatewayStore((s) => s.agents);
  const options = [
    { id: "*", label: "* — allow any" },
    ...agents.map((a) => ({ id: a.id, label: a.name || a.id, sub: a.id })),
  ];
  return <SimpleCombobox value={value} onChange={onChange} options={options} placeholder="Select agents or type IDs..." mono />;
}

function ModelCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const gatewayModels = useGatewayStore((s) => s.availableModels);
  const options = deduplicateModelOptions(gatewayModels.flatMap((g) =>
    g.models.map((m) => ({ id: m.id, label: m.label, sub: g.provider }))
  ));
  return <SimpleCombobox value={value} onChange={onChange} options={options} placeholder="Inherit global model..." mono />;
}

// ─── Workspace Files ─────────────────────────────────────────────────────────

const STD_FILES: { key: string; name: string; required?: boolean; tooltip: string }[] = [
  { key: "soulMd",      name: "SOUL.md",      required: true,  tooltip: "Character sheet: personality, tone, values, behavioral constraints. The only required file — injected first into context. Keep under 500 lines / 2000 words." },
  { key: "agentsMd",    name: "AGENTS.md",    tooltip: "Operational procedures: boot sequence, workflows, checklists. Usually the largest file." },
  { key: "identityMd",  name: "IDENTITY.md",  tooltip: "Routing metadata: name, ID, emoji, role label, personality theme. Short by design." },
  { key: "userMd",      name: "USER.md",      tooltip: "Context about the human: preferences, style, timezone. Only loaded in main DM sessions — never in group chats." },
  { key: "heartbeatMd", name: "HEARTBEAT.md", tooltip: "Periodic tasks with cron schedule or natural language. Checklist executed each thinking cycle." },
  { key: "toolsMd",     name: "TOOLS.md",     tooltip: "Notes on available tools, SSH hosts, usage conventions and custom restrictions." },
  { key: "memoryMd",    name: "MEMORY.md",    tooltip: "Curated long-term memory: iron-law rules and permanent facts. Only loaded in main DM sessions for security." },
];

// Files with inline editors (no dedicated step)
const EDITABLE_FILE_KEYS = new Set(["toolsMd", "bootMd", "hookMd", "workingMd"]);

const ADV_FILES: { key: string; name: string; tooltip: string }[] = [
  { key: "bootMd",    name: "BOOT.md",    tooltip: "Startup hook — actions executed at the beginning of every session." },
  { key: "hookMd",    name: "HOOK.md",    tooltip: "TypeScript hooks scanned by the gateway. Define custom event handlers (onMessage, onToolCall, etc.) that run alongside the agent." },
  { key: "workingMd", name: "WORKING.md", tooltip: "Persistent task state. Allows execution to resume after a gateway restart." },
];

function WorkspaceFilesSection({
  includeFiles,
  onToggle,
  fileContents,
  onFileContent,
}: {
  includeFiles: Record<string, boolean>;
  onToggle: (key: string) => void;
  fileContents: Record<string, string>;
  onFileContent: (key: string, content: string) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const FileRow = ({ file, required }: { file: typeof STD_FILES[0]; required?: boolean }) => {
    const editable = !required && EDITABLE_FILE_KEYS.has(file.key);
    const on = includeFiles[file.key] ?? false;
    return (
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <code className="text-xs font-mono text-foreground font-medium">{file.name}</code>
            {required && (
              <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-accent-soft text-accent border border-accent/20">Required</span>
            )}
            <InfoTooltip text={file.tooltip} />
          </div>
          {!required && (
            <Toggle checked={on} onChange={() => onToggle(file.key)} />
          )}
        </div>
        {editable && on && (
          <textarea
            value={fileContents[file.key] ?? ""}
            onChange={(e) => onFileContent(file.key, e.target.value)}
            placeholder={`# ${file.name}\n\n`}
            rows={4}
            className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent/50 resize-y"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-foreground-muted mb-2">Standard files — created in the agent workspace on creation.</p>
      <div className="divide-y divide-line rounded-lg border border-line overflow-hidden">
        {STD_FILES.map((f) => (
          <FileRow key={f.key} file={f} required={f.required} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 pt-2 text-[11px] text-foreground-muted hover:text-foreground transition-colors"
      >
        <ChevronDown size={12} strokeWidth={2.5} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Advanced files
      </button>

      {showAdvanced && (
        <div className="divide-y divide-line rounded-lg border border-line overflow-hidden">
          {ADV_FILES.map((f) => (
            <FileRow key={f.key} file={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepDefaults({ state, onChange, includeFiles, onFileToggle, fileContents, onFileContent, enabledTools }: {
  state: DefaultsState;
  onChange: <K extends keyof DefaultsState>(field: K, value: DefaultsState[K]) => void;
  includeFiles: Record<string, boolean>;
  onFileToggle: (key: string) => void;
  fileContents: Record<string, string>;
  onFileContent: (key: string, content: string) => void;
  enabledTools: string[];
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    files: true, perAgent: true, behavior: true, streaming: false, context: false,
    performance: false, media: false, envelope: false, workspace: false, advanced: false,
  });

  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const textInput = (field: keyof DefaultsState, placeholder: string, mono = false) => (
    <input
      type="text"
      value={state[field] as string}
      onChange={(e) => onChange(field, e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 ${mono ? "font-mono" : ""}`}
    />
  );

  return (
    <div className="space-y-0 divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">

      {/* ── Workspace Files ── */}
      <div className="p-4 space-y-3">
        <SectionHeader label="Workspace Files" open={openSections.files} onToggle={() => toggle("files")} />
        {openSections.files && (
          <WorkspaceFilesSection
            includeFiles={includeFiles}
            onToggle={onFileToggle}
            fileContents={fileContents}
            onFileContent={onFileContent}
          />
        )}
      </div>

      {/* ── Per-Agent ── */}
      <div className="p-4 space-y-3">
        <SectionHeader label="Per-Agent Overrides" open={openSections.perAgent} onToggle={() => toggle("perAgent")} />
        {openSections.perAgent && (
          <div className="space-y-4 pt-1">
            {!enabledTools.includes("spawn") && (
              <p className="text-xs text-foreground-muted rounded-md bg-surface-muted border border-line px-3 py-2">
                Habilite <span className="font-mono text-foreground">sessions_spawn</span> no Step 3 para configurar sub-agents.
              </p>
            )}
            <FieldWithInfo label="Allowed Sub-agents" tooltip="Agents this agent is allowed to spawn as sub-agents. Use * to allow any, or leave empty for none.">
              <div className={!enabledTools.includes("spawn") ? "opacity-40 pointer-events-none" : ""}>
                <SubAgentCombobox
                  value={state.allowSubagents}
                  onChange={(v) => onChange("allowSubagents", v)}
                />
              </div>
            </FieldWithInfo>
            <FieldWithInfo label="Sub-agent Model" tooltip="Default model used when this agent spawns a sub-agent. Leave empty to inherit the global model setting.">
              <div className={!enabledTools.includes("spawn") ? "opacity-40 pointer-events-none" : ""}>
                <ModelCombobox
                  value={state.subagentModel}
                  onChange={(v) => onChange("subagentModel", v)}
                />
              </div>
            </FieldWithInfo>
            <FieldWithInfo label="Human Delay" tooltip="Add realistic pauses between message blocks to make responses feel more natural to end users.">
              <div className="flex items-center gap-2">
                <Toggle checked={state.humanDelayEnabled} onChange={(v) => onChange("humanDelayEnabled", v)} />
                <span className="text-xs text-foreground-muted">{state.humanDelayEnabled ? "Enabled (use Advanced to fine-tune)" : "Disabled"}</span>
              </div>
            </FieldWithInfo>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function NewAgentPage() {
  const router = useRouter();
  const isConnected = useGatewayStore((s) => s.status === "connected");
  const stateDir = useGatewayStore((s) => s.stateDir);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Identity
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("developer");
  const [customRole, setCustomRole] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState<"auto" | "existing" | "custom">("auto");
  const [customWorkspace, setCustomWorkspace] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [existingWorkspaces, setExistingWorkspaces] = useState<ExistingWorkspace[]>([]);

  // Fetch existing workspaces on mount
  useEffect(() => {
    if (isConnected) {
      listWorkspacesViaGateway().then((res) => {
        if (res.ok) setExistingWorkspaces(res.workspaces);
      });
    }
  }, [isConnected]);

  // Step 2 — Soul
  const [soulMd, setSoulMd] = useState(() => {
    const tmpl = SOUL_TEMPLATES.find((t) => t.role === "blank")!;
    return tmpl.soulMd;
  });
  const [agentsMd, setAgentsMd] = useState(() => {
    const tmpl = SOUL_TEMPLATES.find((t) => t.role === "blank")!;
    return tmpl.agentsMd;
  });

  // Step 3 — Tools
  const [enabledTools, setEnabledTools] = useState(["bash", "read", "edit", "spawn"]);
  const [heartbeatMd, setHeartbeatMd] = useState(generateHeartbeatMd());
  const [memoryMd, setMemoryMd] = useState("");
  const [userMd, setUserMd] = useState(generateUserMd());

  // Step 4 — Model
  const [model, setModel] = useState("");
  const [modelForced, setModelForced] = useState(false);
  const [modelFallback, setModelFallback] = useState("");
  const [idleAction, setIdleAction] = useState<IdleAction>("standby");
  const [maxRetries, setMaxRetries] = useState(3);
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>("host");

  // Step 5 — Defaults
  const [defaults, setDefaults] = useState<DefaultsState>(EMPTY_DEFAULTS);
  const [includeFiles, setIncludeFiles] = useState<Record<string, boolean>>({
    soulMd: true, agentsMd: true, identityMd: true, userMd: true,
    heartbeatMd: true, toolsMd: false, memoryMd: false,
    bootMd: false, hookMd: false, workingMd: false,
  });
  const toggleFile = (key: string) =>
    setIncludeFiles((prev) => ({ ...prev, [key]: !prev[key] }));
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const handleFileContent = (key: string, content: string) =>
    setFileContents((prev) => ({ ...prev, [key]: content }));

  const handleDefaultsChange = <K extends keyof DefaultsState>(field: K, value: DefaultsState[K]) => {
    setDefaults((prev) => ({ ...prev, [field]: value }));
  };

  const identityFields = { name, displayName, role, customRole, emoji, theme, description };
  const handleIdentityChange = (field: string, value: string) => {
    const map: Record<string, (v: string) => void> = {
      name: setName, displayName: setDisplayName, role: setRole,
      customRole: setCustomRole, emoji: setEmoji, theme: setTheme, description: setDescription,
    };
    map[field]?.(value);
  };

  const handleModelChange = (field: string, value: string | boolean | number) => {
    if (field === "model")        setModel(value as string);
    if (field === "modelForced")  setModelForced(value as boolean);
    if (field === "modelFallback") setModelFallback(value as string);
    if (field === "idleAction")   setIdleAction(value as IdleAction);
    if (field === "maxRetries")   setMaxRetries(value as number);
    if (field === "sandboxMode")  setSandboxMode(value as SandboxMode);
  };

  // ─── Import from ZIP ──────────────────────────────────────────────────────
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [importResult, setImportResult] = useState<string | null>(null);

  const handleZipImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const mdFiles: Record<string, string> = {};

      // Find .md files — support nested dirs (agent/, or flat)
      for (const [zipPath, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const fileName = zipPath.split("/").pop() ?? "";
        if (!fileName.endsWith(".md")) continue;
        const content = await entry.async("text");
        mdFiles[fileName] = content;
      }

      const found: string[] = [];

      // Helper: case-insensitive file lookup
      const getMd = (name: string): string | undefined => {
        const upper = name.toUpperCase();
        for (const [k, v] of Object.entries(mdFiles)) {
          if (k.toUpperCase() === upper) return v;
        }
        return undefined;
      };

      // Parse IDENTITY.md for name/emoji/vibe
      const identityContent = getMd("IDENTITY.md");
      if (identityContent) {
        found.push("IDENTITY.md");
        // Try **Name:** format first, then "- Name:" format
        const nameMatch = identityContent.match(/\*?\*?Name:?\*?\*?\s*(.+)/i)
          ?? identityContent.match(/^-\s*Name:\s*(.+)/mi);
        const emojiMatch = identityContent.match(/\*?\*?Emoji:?\*?\*?\s*(.+)/i)
          ?? identityContent.match(/^-\s*Emoji:\s*(.+)/mi);
        const vibeMatch = identityContent.match(/\*?\*?Vibe:?\*?\*?\s*(.+)/i)
          ?? identityContent.match(/^-\s*Vibe:\s*(.+)/mi);
        const creatureMatch = identityContent.match(/\*?\*?Creature:?\*?\*?\s*(.+)/i)
          ?? identityContent.match(/^-\s*Creature:\s*(.+)/mi);

        const trySet = (match: RegExpMatchArray | null, setter: (v: string) => void) => {
          if (!match) return;
          const val = match[1].trim().replace(/^_?\(.*\)_?$/, "").trim();
          if (val && val.length > 0) setter(val);
        };

        trySet(nameMatch, (v) => {
          setDisplayName(v);
          setName(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
        });
        trySet(emojiMatch, setEmoji);
        trySet(vibeMatch, setTheme);
        trySet(creatureMatch, setDescription);
      }

      // Map known RPC-supported files to state
      const soul = getMd("SOUL.md");
      if (soul) { setSoulMd(soul); found.push("SOUL.md"); }

      const agents = getMd("AGENTS.md");
      if (agents) { setAgentsMd(agents); found.push("AGENTS.md"); }

      const heartbeat = getMd("HEARTBEAT.md");
      if (heartbeat) { setHeartbeatMd(heartbeat); found.push("HEARTBEAT.md"); }

      const user = getMd("USER.md");
      if (user) { setUserMd(user); found.push("USER.md"); }

      const memory = getMd("MEMORY.md");
      if (memory) { setMemoryMd(memory); found.push("MEMORY.md"); }

      const tools = getMd("TOOLS.md");
      if (tools) { found.push("TOOLS.md"); }

      const bootstrap = getMd("BOOTSTRAP.md");
      if (bootstrap) found.push("BOOTSTRAP.md");

      // SYSTEM.md → SOUL.md fallback
      const system = getMd("SYSTEM.md");
      if (!soul && system) {
        setSoulMd(system);
        found.push("SYSTEM.md → SOUL.md");
      }

      // Non-RPC custom files → concatenate into AGENTS.md as reference sections
      const rpcFiles = new Set([
        "IDENTITY.md", "SOUL.md", "AGENTS.md", "HEARTBEAT.md", "USER.md",
        "MEMORY.md", "TOOLS.md", "BOOT.md", "HOOK.md", "WORKING.md",
        "BOOTSTRAP.md", "README.md", "SYSTEM.md",
      ]);
      const customFiles: { name: string; content: string }[] = [];
      for (const [fileName, content] of Object.entries(mdFiles)) {
        const isRpc = Array.from(rpcFiles).some((r) => r.toUpperCase() === fileName.toUpperCase());
        if (!isRpc) {
          customFiles.push({ name: fileName, content });
        }
      }

      // Append custom files as sections in AGENTS.md
      if (customFiles.length > 0) {
        const currentAgents = agents ?? agentsMd;
        const appendix = customFiles
          .map((f) => `\n\n---\n\n<!-- Imported from: ${f.name} -->\n\n${f.content}`)
          .join("");
        setAgentsMd(currentAgents + appendix);
        found.push(...customFiles.map((f) => `${f.name} → AGENTS.md`));
      }

      // Enable file includes
      setIncludeFiles((prev) => ({
        ...prev,
        soulMd: true,
        identityMd: !!identityContent,
        agentsMd: !!(agents || customFiles.length > 0),
        heartbeatMd: !!heartbeat,
        userMd: !!user,
        memoryMd: !!memory,
        toolsMd: !!tools,
      }));

      // Extra editable files
      if (tools) setFileContents((prev) => ({ ...prev, toolsMd: tools }));
      const boot = getMd("BOOT.md");
      if (boot) { setIncludeFiles((prev) => ({ ...prev, bootMd: true })); setFileContents((prev) => ({ ...prev, bootMd: boot })); }
      const hook = getMd("HOOK.md");
      if (hook) { setIncludeFiles((prev) => ({ ...prev, hookMd: true })); setFileContents((prev) => ({ ...prev, hookMd: hook })); }
      const working = getMd("WORKING.md");
      if (working) { setIncludeFiles((prev) => ({ ...prev, workingMd: true })); setFileContents((prev) => ({ ...prev, workingMd: working })); }

      setImportResult(`Imported ${found.length} files: ${found.join(", ")}`);
    } catch (err) {
      setError(`Failed to read ZIP: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setImporting(false);
  };

  const canProceed = useMemo(() => {
    if (step === 1) return !!name.trim() && !!role;
    return true;
  }, [step, name, role]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    let workspace: string;
    if (workspaceMode === "existing" && selectedWorkspace) {
      workspace = selectedWorkspace;
    } else if (workspaceMode === "custom" && customWorkspace.trim()) {
      workspace = customWorkspace.trim();
    } else {
      const workspaceBase = stateDir ? stateDir.replace(/\/?$/, "") : "/data";
      workspace = `${workspaceBase}/workspace/${name}`;
    }

    const result = await createAgentViaGateway({ name, workspace, emoji });

    if (!result.ok || !result.agentId) {
      setError(result.error ?? "Failed to create agent via gateway");
      setSubmitting(false);
      return;
    }

    const agentId = result.agentId;

    // Write workspace files
    const identityMd = generateIdentityMd({
      name: displayName || name,
      emoji,
      vibe: theme || undefined,
    });
    const resolvedSoulMd = soulMd || generateSoulMd(displayName || name);
    const resolvedAgentsMd = agentsMd || generateAgentsMd(displayName || name);
    const bootstrapMd = generateBootstrapMd(displayName || name);

    const filesToWrite = [
      { name: "SOUL.md", content: resolvedSoulMd }, // always required
      ...(includeFiles.identityMd  ? [{ name: "IDENTITY.md",  content: identityMd }] : []),
      ...(includeFiles.agentsMd    ? [{ name: "AGENTS.md",    content: resolvedAgentsMd }] : []),
      ...(includeFiles.heartbeatMd ? [{ name: "HEARTBEAT.md", content: heartbeatMd }] : []),
      ...(includeFiles.userMd      ? [{ name: "USER.md",      content: userMd }] : []),
      { name: "BOOTSTRAP.md", content: bootstrapMd }, // always included, auto-deleted after first run
      ...(includeFiles.hookMd ? [{ name: "HOOK.md", content: fileContents.hookMd || `// HOOK.md — Custom gateway hooks\n// See: https://openclaw.dev/docs/hooks\n\nexport default {};\n` }] : []),
      ...(includeFiles.memoryMd && memoryMd ? [{ name: "MEMORY.md", content: memoryMd }] : []),
      ...(includeFiles.toolsMd   ? [{ name: "TOOLS.md",   content: fileContents.toolsMd   || `# Tools\n\n<!-- Document available tools, SSH hosts, usage conventions and custom restrictions. -->\n` }] : []),
      ...(includeFiles.bootMd    ? [{ name: "BOOT.md",    content: fileContents.bootMd    || `# Boot\n\n<!-- Actions to execute at the start of each session. -->\n` }] : []),
      ...(includeFiles.workingMd ? [{ name: "WORKING.md", content: fileContents.workingMd || `# Working\n\n<!-- Current task state — updated by the agent to persist work across restarts. -->\n` }] : []),
    ];

    for (const file of filesToWrite) {
      await setAgentFileViaGateway(agentId, file.name, file.content);
    }

    // Write defaults to gateway config
    const perAgent: Record<string, unknown> = {};

    // Always configure heartbeat for new agents (60s default)
    perAgent.heartbeat = { every: "60s", model: "rikuchan-heartbeat/glm-4.7-flash" };

    if (defaults.allowSubagents.trim()) {
      const ids = defaults.allowSubagents.split(",").map((s) => s.trim()).filter(Boolean);
      perAgent.subagents = { allowAgents: ids, ...(defaults.subagentModel ? { model: defaults.subagentModel } : {}) };
    }
    if (defaults.humanDelayEnabled) perAgent.humanDelay = { mode: "natural" };

    const globalDefaults: Record<string, unknown> = {};
    // behavior
    if (defaults.thinkingDefault)      globalDefaults.thinkingDefault = defaults.thinkingDefault;
    if (defaults.verboseDefault)       globalDefaults.verboseDefault = defaults.verboseDefault;
    if (defaults.elevatedDefault)      globalDefaults.elevatedDefault = defaults.elevatedDefault;
    if (defaults.typingMode)           globalDefaults.typingMode = defaults.typingMode;
    if (defaults.typingIntervalSeconds !== "") globalDefaults.typingIntervalSeconds = defaults.typingIntervalSeconds;
    // block streaming
    if (defaults.blockStreamingDefault) globalDefaults.blockStreamingDefault = defaults.blockStreamingDefault;
    if (defaults.blockStreamingDefault === "on" && defaults.blockStreamingBreak)
      globalDefaults.blockStreamingBreak = defaults.blockStreamingBreak;
    if (defaults.blockStreamingChunk)   { try { globalDefaults.blockStreamingChunk = JSON.parse(defaults.blockStreamingChunk); } catch { globalDefaults.blockStreamingChunk = defaults.blockStreamingChunk; } }
    if (defaults.blockStreamingCoalesce) { try { globalDefaults.blockStreamingCoalesce = JSON.parse(defaults.blockStreamingCoalesce); } catch { globalDefaults.blockStreamingCoalesce = defaults.blockStreamingCoalesce; } }
    // context & bootstrap
    if (defaults.contextTokens !== "")     globalDefaults.contextTokens = defaults.contextTokens;
    if (defaults.bootstrapMaxChars !== "") globalDefaults.bootstrapMaxChars = defaults.bootstrapMaxChars;
    if (defaults.bootstrapTotalMaxChars !== "") globalDefaults.bootstrapTotalMaxChars = defaults.bootstrapTotalMaxChars;
    if (defaults.bootstrapTruncWarning)    globalDefaults.bootstrapPromptTruncationWarning = defaults.bootstrapTruncWarning;
    if (defaults.skipBootstrap)            globalDefaults.skipBootstrap = true;
    // performance
    if (defaults.maxConcurrent !== "")     globalDefaults.maxConcurrent = defaults.maxConcurrent;
    if (defaults.timeoutSeconds !== "")    globalDefaults.timeoutSeconds = defaults.timeoutSeconds;
    // media
    if (defaults.imageMaxDimension !== "") globalDefaults.imageMaxDimensionPx = defaults.imageMaxDimension;
    if (defaults.imageModel)               { try { globalDefaults.imageModel = JSON.parse(defaults.imageModel); } catch { globalDefaults.imageModel = defaults.imageModel; } }
    if (defaults.mediaMaxMb !== "")        globalDefaults.mediaMaxMb = defaults.mediaMaxMb;
    if (defaults.pdfMaxSizeMb !== "")      globalDefaults.pdfMaxSizeMb = defaults.pdfMaxSizeMb;
    if (defaults.pdfMaxPages !== "")       globalDefaults.pdfMaxPages = defaults.pdfMaxPages;
    if (defaults.pdfModel)                 { try { globalDefaults.pdfModel = JSON.parse(defaults.pdfModel); } catch { globalDefaults.pdfModel = defaults.pdfModel; } }
    // envelope & time
    if (defaults.envelopeTimestamp)        globalDefaults.envelopeTimestamp = defaults.envelopeTimestamp;
    if (defaults.envelopeElapsed)          globalDefaults.envelopeElapsed = defaults.envelopeElapsed;
    if (defaults.envelopeTimezone)         globalDefaults.envelopeTimezone = defaults.envelopeTimezone;
    if (defaults.userTimezone)             globalDefaults.userTimezone = defaults.userTimezone;
    if (defaults.timeFormat)               globalDefaults.timeFormat = defaults.timeFormat;
    // workspace
    if (defaults.workspace)                globalDefaults.workspace = defaults.workspace;
    if (defaults.repoRoot)                 globalDefaults.repoRoot = defaults.repoRoot;
    // advanced JSON fields
    if (defaults.heartbeatJson)      { try { globalDefaults.heartbeat = JSON.parse(defaults.heartbeatJson); } catch {} }
    if (defaults.humanDelayJson)     { try { perAgent.humanDelay = JSON.parse(defaults.humanDelayJson); } catch {} }
    if (defaults.sandboxJson)        { try { perAgent.sandbox = JSON.parse(defaults.sandboxJson); } catch {} }
    if (defaults.compactionJson)     { try { globalDefaults.compaction = JSON.parse(defaults.compactionJson); } catch {} }
    if (defaults.contextPruningJson) { try { globalDefaults.contextPruning = JSON.parse(defaults.contextPruningJson); } catch {} }
    if (defaults.memorySearchJson)   { try { perAgent.memorySearch = JSON.parse(defaults.memorySearchJson); } catch {} }
    if (defaults.cliBackendsJson)    { try { globalDefaults.cliBackends = JSON.parse(defaults.cliBackendsJson); } catch {} }
    if (defaults.embeddedPiJson)     { try { globalDefaults.embeddedPi = JSON.parse(defaults.embeddedPiJson); } catch {} }
    if (defaults.modelsJson)         { try { globalDefaults.models = JSON.parse(defaults.modelsJson); } catch {} }

    await patchAgentDefaults({ agentId, perAgent, globalDefaults });

    router.push(`/agents/${agentId}`);
  };

  const STEP_ICONS = [Crown, Brain, Wrench, Cpu, Settings2];
  const StepIcon = STEP_ICONS[step - 1];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Agents
      </Link>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2
            className="text-xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            New Agent
          </h2>
          <div>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleZipImport(file);
                if (zipInputRef.current) zipInputRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-strong text-xs text-foreground-muted hover:text-foreground hover:border-accent/40 transition-colors disabled:opacity-50"
            >
              <Upload size={12} />
              {importing ? "Importing..." : "Import from ZIP"}
            </button>
          </div>
        </div>
        <StepIndicator current={step} />
      </div>

      {!isConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warm-soft px-4 py-3">
          <span className="text-xs text-warning">
            Gateway not connected. Agent will be created when gateway is available.
          </span>
          <Link href="/agents/gateway" className="text-xs text-accent hover:text-accent-deep font-medium shrink-0 ml-auto">
            Connect →
          </Link>
        </div>
      )}

      {importResult && (
        <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
          <span className="text-xs text-accent">{importResult}</span>
          <button
            type="button"
            onClick={() => setImportResult(null)}
            className="text-accent/60 hover:text-accent ml-2"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <StepIcon size={15} className="text-accent" />
          <h3 className="text-base font-semibold text-foreground">{STEPS[step - 1].label}</h3>
        </div>

        {step === 1 && (
          <StepIdentity
            {...identityFields}
            onChange={handleIdentityChange}
            workspaceMode={workspaceMode}
            onWorkspaceModeChange={setWorkspaceMode}
            customWorkspace={customWorkspace}
            onCustomWorkspaceChange={setCustomWorkspace}
            selectedWorkspace={selectedWorkspace}
            onSelectedWorkspaceChange={setSelectedWorkspace}
            existingWorkspaces={existingWorkspaces}
          />
        )}
        {step === 2 && (
          <SoulEditor
            name={displayName || name}
            soulMd={soulMd}
            agentsMd={agentsMd}
            onSoulChange={setSoulMd}
            onAgentsChange={setAgentsMd}
          />
        )}
        {step === 3 && (
          <StepTools
            enabledTools={enabledTools}
            heartbeatMd={heartbeatMd}
            memoryMd={memoryMd}
            userMd={userMd}
            onToolsChange={setEnabledTools}
            onHeartbeatChange={setHeartbeatMd}
            onMemoryChange={setMemoryMd}
            onUserChange={setUserMd}
          />
        )}
        {step === 4 && (
          <StepModel
            model={model}
            modelForced={modelForced}
            modelFallback={modelFallback}
            idleAction={idleAction}
            maxRetries={maxRetries}
            sandboxMode={sandboxMode}
            onChange={handleModelChange}
          />
        )}
        {step === 5 && (
          <StepDefaults
            state={defaults}
            onChange={handleDefaultsChange}
            includeFiles={includeFiles}
            onFileToggle={toggleFile}
            fileContents={fileContents}
            onFileContent={handleFileContent}
            enabledTools={enabledTools}
          />
        )}

        {error && (
          <div className="mt-4 rounded-md border border-danger/20 bg-danger/5 px-4 py-3">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">Step {step} of {STEPS.length}</span>
          {step < STEPS.length ? (
            <button
              type="button"
              onClick={() => canProceed && setStep((s) => s + 1)}
              disabled={!canProceed}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Agent"}
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
