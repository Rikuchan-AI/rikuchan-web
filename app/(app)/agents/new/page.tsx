"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Plus,
  Crown, Brain, Wrench, Cpu, Eye,
} from "lucide-react";
import Link from "next/link";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { createAgentViaGateway, setAgentFileViaGateway } from "@/lib/mc/agent-files";
import {
  generateIdentityMd,
  generateSoulMd,
  generateAgentsMd,
  generateUserMd,
  generateToolsMd,
  generateHeartbeatMd,
  generateBootstrapMd,
} from "@/lib/mc/agent-files";
import { MODEL_GROUPS } from "@/lib/mc/models";
import { SOUL_TEMPLATES, applyTemplateName } from "@/lib/mc/soul-templates";

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Identity", icon: Crown },
  { id: 2, label: "Soul",     icon: Brain },
  { id: 3, label: "Tools",    icon: Wrench },
  { id: 4, label: "Model",    icon: Cpu },
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

const ROLE_OPTIONS = [
  { value: "lead",       label: "Lead Agent" },
  { value: "developer",  label: "Developer" },
  { value: "reviewer",   label: "Reviewer" },
  { value: "researcher", label: "Researcher" },
  { value: "documenter", label: "Documenter" },
  { value: "custom",     label: "Custom" },
];

const EMOJI_OPTIONS = [
  "🤖", "🦾", "🧠", "⚙️", "🔧", "🚀", "🛡", "🎯",
  "🔬", "📊", "💡", "🦊", "🦞", "🐉", "🦅", "🎭",
];

function StepIdentity({
  name, displayName, role, customRole, emoji, theme, description,
  onChange,
}: {
  name: string;
  displayName: string;
  role: string;
  customRole: string;
  emoji: string;
  theme: string;
  description: string;
  onChange: (field: string, value: string) => void;
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
        <select
          value={role}
          onChange={(e) => onChange("role", e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {role === "custom" && (
          <input
            type="text"
            value={customRole}
            onChange={(e) => onChange("customRole", e.target.value)}
            placeholder="Custom role label..."
            className="mt-2 w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
          />
        )}
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
  const modelGroups = gatewayModels.length > 0 ? gatewayModels : MODEL_GROUPS;
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
        <select
          value={model}
          onChange={(e) => onChange("model", e.target.value)}
          className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
        >
          <option value="">Gateway routing (auto)</option>
          {modelGroups.map((group) => (
            <optgroup key={group.provider} label={group.provider}>
              {group.models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}{m.recommended ? " ★" : ""}</option>
              ))}
            </optgroup>
          ))}
        </select>
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
          <select
            value={modelFallback}
            onChange={(e) => onChange("modelFallback", e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
          >
            <option value="">None</option>
            {allModels.filter((m) => m.id !== model).map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
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
          <FieldLabel>Sandbox</FieldLabel>
          <select
            value={sandboxMode}
            onChange={(e) => onChange("sandboxMode", e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none"
          >
            <option value="host">Host (full access)</option>
            <option value="docker">Docker (sandboxed)</option>
          </select>
        </div>
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
  const [enabledTools, setEnabledTools] = useState(["bash", "read", "edit"]);
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

  const canProceed = useMemo(() => {
    if (step === 1) return !!name.trim() && !!role;
    return true;
  }, [step, name, role]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    const workspaceBase = stateDir ? stateDir.replace(/\/?$/, "") : "/data";
    const workspace = `${workspaceBase}/workspace/${name}`;

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
      { name: "IDENTITY.md",  content: identityMd },
      { name: "SOUL.md",      content: resolvedSoulMd },
      { name: "AGENTS.md",    content: resolvedAgentsMd },
      { name: "HEARTBEAT.md", content: heartbeatMd },
      { name: "USER.md",      content: userMd },
      { name: "BOOTSTRAP.md", content: bootstrapMd },
      ...(memoryMd ? [{ name: "MEMORY.md", content: memoryMd }] : []),
    ];

    for (const file of filesToWrite) {
      await setAgentFileViaGateway(agentId, file.name, file.content);
    }

    router.push(`/agents/${agentId}`);
  };

  const STEP_ICONS = [Crown, Brain, Wrench, Cpu];
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
        <h2
          className="text-xl font-semibold tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New Agent
        </h2>
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

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <StepIcon size={15} className="text-accent" />
          <h3 className="text-base font-semibold text-foreground">{STEPS[step - 1].label}</h3>
        </div>

        {step === 1 && (
          <StepIdentity {...identityFields} onChange={handleIdentityChange} />
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
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">Step {step} of {STEPS.length}</span>
          {step < 4 ? (
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
