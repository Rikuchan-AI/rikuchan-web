"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Crown, Code, Wrench, Cpu, History, FileText,
  RefreshCw, AlertTriangle, Check, Clock, Download,
  Copy, ChevronDown, ChevronRight, Upload, X, MoreHorizontal, Search,
  Eye, Pencil,
} from "lucide-react";
import Markdown from "react-markdown";
import { MonacoMarkdownEditor } from "@/components/mc/editors/MonacoMarkdownEditor";
import { useShallow } from "zustand/react/shallow";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { toast } from "@/components/shared/toast";
import { Mascot } from "@/components/shared/mascot";
import { useProjectsStore } from "@/lib/mc/projects-store";
import { AgentStatusBadge } from "@/components/mc/agents/AgentStatusBadge";
import { AgentSessionList } from "@/components/mc/agents/AgentSessionList";
import {
  getAgentFileViaGateway,
  setAgentFileViaGateway,
  listAgentFilesViaGateway,
  AGENT_CORE_FILES,
} from "@/lib/mc/agent-files";


// ─── Types ────────────────────────────────────────────────────────────────────

type SyncStatus = "synced" | "pending" | "desync" | "unknown";

interface FileVersion {
  version: number;
  content: string;
  savedAt: number;
  summary?: string;
}

interface AgentFileState {
  content: string;
  original: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt?: number;
  syncStatus: SyncStatus;
  versions: FileVersion[];
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "identity",  label: "Identity",        icon: Crown },
  { id: "soul",      label: "Soul & Behavior",  icon: Code },
  { id: "tools",     label: "Tools & Memory",   icon: Wrench },
  { id: "model",     label: "Model",            icon: Cpu },
  { id: "sessions",  label: "Sessions",         icon: History },
  { id: "logs",      label: "Logs",             icon: FileText },
];

// ─── Sync badge ───────────────────────────────────────────────────────────────

function SyncBadge({ status }: { status: SyncStatus }) {
  const MAP: Record<SyncStatus, { label: string; cls: string }> = {
    synced:  { label: "Synced ✓",        cls: "bg-success/10 text-success border-success/20" },
    pending: { label: "Pending sync ⏳",  cls: "bg-warning/10 text-warning border-warning/20" },
    desync:  { label: "Desync ⚠",        cls: "bg-danger/10 text-danger border-danger/20" },
    unknown: { label: "Unknown",          cls: "bg-surface-strong text-foreground-muted border-line" },
  };
  const { label, cls } = MAP[status];
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── File editor ─────────────────────────────────────────────────────────────

function FileEditor({
  fileName,
  agentId,
  state,
  onContentChange,
  onSave,
  onRevert,
}: {
  fileName: string;
  agentId: string;
  state: AgentFileState;
  onContentChange: (v: string) => void;
  onSave: (summary?: string) => void;
  onRevert: (version: FileVersion) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [saveSummary, setSaveSummary] = useState("");
  const [preview, setPreview] = useState(false);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="mono text-xs text-foreground-muted">{fileName}</span>
          <SyncBadge status={state.syncStatus} />
          {state.dirty && (
            <span className="text-[10px] text-warning">· unsaved changes</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className={`flex items-center gap-1 h-7 px-2 rounded-md border text-[10px] transition-colors ${
              preview
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line bg-surface-strong text-foreground-muted hover:text-foreground"
            }`}
          >
            {preview ? <Pencil size={10} /> : <Eye size={10} />}
            {preview ? "Edit" : "Preview"}
          </button>
          {state.versions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1 h-7 px-2 rounded-md border border-line bg-surface-strong text-[10px] text-foreground-muted hover:text-foreground transition-colors"
            >
              <History size={10} />
              v{state.versions.length}
            </button>
          )}
          {state.dirty && (
            <button
              type="button"
              onClick={() => onContentChange(state.original)}
              className="h-7 px-2 rounded-md border border-line bg-surface-strong text-[10px] text-foreground-muted hover:text-foreground transition-colors"
            >
              Revert
            </button>
          )}
        </div>
      </div>

      {/* History drawer */}
      {showHistory && state.versions.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-strong p-3 space-y-2">
          <p className="mono text-[10px] uppercase text-foreground-muted tracking-wider">Version History</p>
          <div className="space-y-1">
            {[...state.versions].reverse().map((v) => (
              <div
                key={v.version}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground-muted">v{v.version}</span>
                  <span className="text-xs text-foreground-muted">{new Date(v.savedAt).toLocaleString()}</span>
                  {v.summary && <span className="text-xs text-foreground-soft">— {v.summary}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => { onRevert(v); setShowHistory(false); }}
                  className="text-[10px] text-accent hover:text-accent-deep"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor / Preview */}
      {state.syncStatus === "desync" && !state.content ? (
        <div className="w-full rounded-md border border-line bg-surface-strong px-4 py-8 min-h-[320px] flex items-center justify-center">
          <p className="text-xs text-foreground-muted text-center">
            Arquivo não disponível — agente offline.<br />
            <span className="text-foreground-muted/60">Inicie o agente para carregar o conteúdo.</span>
          </p>
        </div>
      ) : preview ? (
        <div className="w-full rounded-md border border-line bg-surface-strong px-4 py-4 min-h-[320px] overflow-y-auto text-sm text-foreground-soft max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:mb-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:mb-2 [&_li]:mb-0.5 [&_li]:text-foreground-soft [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_code]:bg-surface [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-accent [&_pre]:bg-surface [&_pre]:rounded-md [&_pre]:border [&_pre]:border-line [&_pre]:p-3 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_hr]:border-line [&_hr]:my-3 [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent/30 [&_blockquote]:pl-3 [&_blockquote]:text-foreground-muted [&_blockquote]:italic [&_blockquote]:my-2">
          <Markdown>{state.content || "*Empty file*"}</Markdown>
        </div>
      ) : (
        <MonacoMarkdownEditor
          value={state.content}
          onChange={onContentChange}
          minHeight={320}
        />
      )}

      {/* Save row */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={saveSummary}
          onChange={(e) => setSaveSummary(e.target.value)}
          placeholder="Change summary (optional)"
          className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
        />
        <button
          type="button"
          onClick={() => { onSave(saveSummary); setSaveSummary(""); }}
          disabled={state.saving || !state.dirty}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
        >
          {state.saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
          {state.saving ? "Saving..." : "Save"}
        </button>
      </div>

      {state.lastSavedAt && (
        <p className="text-[10px] text-foreground-muted">
          Last saved: {new Date(state.lastSavedAt).toLocaleString()}
          {" · "}Applied on next session start
        </p>
      )}
    </div>
  );
}

// ─── Tab: Identity ────────────────────────────────────────────────────────────

function TabIdentity({
  agentId,
  fileStates,
  onContentChange,
  onSaveFile,
  onRevertFile,
}: {
  agentId: string;
  fileStates: Record<string, AgentFileState>;
  onContentChange: (fileName: string, content: string) => void;
  onSaveFile: (fileName: string, summary?: string) => void;
  onRevertFile: (fileName: string, version: FileVersion) => void;
}) {
  const agent = useGatewayStore(useShallow((s) => s.agents.find((a) => a.id === agentId)));

  return (
    <div className="space-y-6">
      {/* Live info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Role",      value: agent?.role },
          { label: "Model",     value: agent?.model ?? "—" },
          { label: "Uptime",    value: agent?.uptime
            ? agent.uptime >= 3600 ? `${Math.floor(agent.uptime / 3600)}h ${Math.floor((agent.uptime % 3600) / 60)}m`
            : agent.uptime >= 60 ? `${Math.floor(agent.uptime / 60)}m`
            : `${agent.uptime}s`
            : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-4">
            <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-1" style={{ letterSpacing: "0.18em" }}>{label}</p>
            <p className="text-sm font-medium text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* IDENTITY.md editor */}
      {fileStates["IDENTITY.md"] ? (
        <div>
          <p className="mono text-xs uppercase text-foreground-muted mb-3" style={{ letterSpacing: "0.18em" }}>Identity File</p>
          <FileEditor
            fileName="IDENTITY.md"
            agentId={agentId}
            state={fileStates["IDENTITY.md"]}
            onContentChange={(v) => onContentChange("IDENTITY.md", v)}
            onSave={(s) => onSaveFile("IDENTITY.md", s)}
            onRevert={(v) => onRevertFile("IDENTITY.md", v)}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="animate-pulse">
            <Mascot size="md" glow />
          </div>
          <p className="text-foreground-muted text-xs">Carregando arquivos do agente...</p>
        </div>
      )}

      {/* Capabilities */}
      {agent?.capabilities && agent.capabilities.length > 0 && (
        <div>
          <p className="mono text-[0.65rem] uppercase text-foreground-muted mb-2" style={{ letterSpacing: "0.18em" }}>Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span key={cap} className="rounded-md bg-surface-strong border border-line-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted">
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Soul & Behavior ────────────────────────────────────────────────────

function TabSoul({
  agentId,
  fileStates,
  onContentChange,
  onSaveFile,
  onRevertFile,
}: {
  agentId: string;
  fileStates: Record<string, AgentFileState>;
  onContentChange: (fileName: string, content: string) => void;
  onSaveFile: (fileName: string, summary?: string) => void;
  onRevertFile: (fileName: string, version: FileVersion) => void;
}) {
  type TabId = "SOUL.md" | "AGENTS.md";
  const [tab, setTab] = useState<TabId>("SOUL.md");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-line">
        {(["SOUL.md", "AGENTS.md"] as TabId[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t ? "border-accent text-foreground" : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {fileStates[tab] ? (
        <FileEditor
          fileName={tab}
          agentId={agentId}
          state={fileStates[tab]}
          onContentChange={(v) => onContentChange(tab, v)}
          onSave={(s) => onSaveFile(tab, s)}
          onRevert={(v) => onRevertFile(tab, v)}
        />
      ) : (
        <p className="text-sm text-foreground-muted py-8 text-center">Loading {tab}...</p>
      )}
    </div>
  );
}

// ─── Tab: Tools & Memory ─────────────────────────────────────────────────────

function TabTools({
  agentId,
  fileStates,
  onContentChange,
  onSaveFile,
  onRevertFile,
}: {
  agentId: string;
  fileStates: Record<string, AgentFileState>;
  onContentChange: (fileName: string, content: string) => void;
  onSaveFile: (fileName: string, summary?: string) => void;
  onRevertFile: (fileName: string, version: FileVersion) => void;
}) {
  type TabId = "TOOLS.md" | "HEARTBEAT.md" | "MEMORY.md" | "USER.md";
  const [tab, setTab] = useState<TabId>("TOOLS.md");
  const tabs: TabId[] = ["TOOLS.md", "HEARTBEAT.md", "MEMORY.md", "USER.md"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t ? "border-accent text-foreground" : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {fileStates[tab] ? (
        <FileEditor
          fileName={tab}
          agentId={agentId}
          state={fileStates[tab]}
          onContentChange={(v) => onContentChange(tab, v)}
          onSave={(s) => onSaveFile(tab, s)}
          onRevert={(v) => onRevertFile(tab, v)}
        />
      ) : (
        <p className="text-sm text-foreground-muted py-8 text-center">Loading {tab}...</p>
      )}
    </div>
  );
}

// ─── Tab: Model ───────────────────────────────────────────────────────────────

function TabModel({ agentId }: { agentId: string }) {
  const agent = useGatewayStore(useShallow((s) => s.agents.find((a) => a.id === agentId)));
  const gatewayModels = useGatewayStore(useShallow((s) => s.availableModels));
  const sendRpc = useGatewayStore((s) => s.sendRpc);
  const modelGroups = gatewayModels;

  const [selectedModel, setSelectedModel] = useState(agent?.model ?? "");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  if (!agent) return null;

  const q = search.toLowerCase();
  const filteredGroups = modelGroups
    .map((g) => ({ ...g, models: q ? g.models.filter((m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : g.models }))
    .filter((g) => g.models.length > 0);

  const handleSave = async () => {
    setSaving(true);
    sendRpc("agents.update", { agentId, model: selectedModel });
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-line">
          <Search size={13} className="text-foreground-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelo..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
          />
          {search && <button type="button" onClick={() => setSearch("")} className="text-foreground-muted hover:text-foreground"><X size={13} /></button>}
        </div>
        {filteredGroups.length === 0 && (
          <p className="px-4 py-6 text-sm text-foreground-muted text-center">Nenhum modelo encontrado.</p>
        )}
        {filteredGroups.map((group, gi) => (
          <div key={group.provider}>
            {gi > 0 && <div className="border-t border-line" />}
            <div className="px-4 py-2 bg-surface-muted">
              <span className="mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>
                {group.provider}
              </span>
            </div>
            {group.models.map((model) => (
              <label
                key={model.id}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-t border-line/50 ${
                  selectedModel === model.id ? "bg-accent-soft" : "hover:bg-surface-strong"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    selectedModel === model.id ? "border-accent bg-accent" : "border-line-strong"
                  }`}>
                    {selectedModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />}
                  </div>
                  <input type="radio" name="agent-model" value={model.id} checked={selectedModel === model.id} onChange={() => setSelectedModel(model.id)} className="sr-only" />
                  <span className={`text-sm ${selectedModel === model.id ? "text-accent font-medium" : "text-foreground"}`}>
                    {model.label}
                  </span>
                  {model.recommended && (
                    <span className="text-[10px] text-warning">★</span>
                  )}
                </div>
                {model.inputCost !== undefined && (
                  <span className="mono text-xs text-foreground-muted">
                    ${model.inputCost}/${model.outputCost} /MTok
                  </span>
                )}
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || selectedModel === agent.model}
          className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
        >
          {saving ? "Updating..." : "Update Model"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Logs ────────────────────────────────────────────────────────────────

function TabLogs({ agentId }: { agentId: string }) {
  const allLogs = useGatewayStore(useShallow((s) => s.logs));
  const logs = allLogs.filter((l) => !l.agentId || l.agentId === agentId);

  const LEVEL_STYLES: Record<string, string> = {
    INFO:  "text-foreground-muted",
    WARN:  "text-warning",
    ERROR: "text-danger",
    DEBUG: "text-foreground-muted/60",
  };

  return (
    <div className="rounded-lg border border-line bg-surface-strong p-4 min-h-[300px] max-h-[480px] overflow-y-auto">
      {logs.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-12">No logs yet</p>
      ) : (
        <div className="space-y-1 font-mono text-[11px]">
          {logs.slice(-200).reverse().map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <span className="text-foreground-muted/50 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`shrink-0 font-semibold ${LEVEL_STYLES[log.level] ?? "text-foreground-muted"}`}>
                {log.level}
              </span>
              <span className="text-foreground-soft">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const agents = useGatewayStore(useShallow((s) => s.agents));
  const agentsLoaded = useGatewayStore((s) => s.agentsLoaded);
  const status = useGatewayStore((s) => s.status);
  const sessions = useGatewayStore(useShallow((s) => s.sessions));
  const projects = useProjectsStore(useShallow((s) => s.projects));

  const agent = agents.find((a) => a.id === agentId);
  const agentSessions = sessions.filter((s) => s.agentId === agentId);
  const agentProjects = projects.filter((p) =>
    p.roster.some((m) => m.agentId === agentId),
  );

  const [activeTab, setActiveTab] = useState("identity");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileStates, setFileStates] = useState<Record<string, AgentFileState>>({});
  const [notFoundConfirmed, setNotFoundConfirmed] = useState(false);

  // Give gateway a moment to push the new agent before showing "not found"
  useEffect(() => {
    if (agent) { setNotFoundConfirmed(false); return; }
    const t = setTimeout(() => setNotFoundConfirmed(true), 3000);
    return () => clearTimeout(t);
  }, [agent]);

  // Load all agent files from gateway
  const loadFiles = useCallback(async () => {
    if (!agentId) return;
    setLoadingFiles(true);
    const result = await listAgentFilesViaGateway(agentId);
    if (result.ok && result.files) {
      const states: Record<string, AgentFileState> = {};
      // First pass: set up states from list (no content yet)
      for (const file of result.files) {
        states[file.name] = {
          content: "",
          original: "",
          dirty: false,
          saving: false,
          syncStatus: file.missing ? "desync" : "synced",
          versions: [],
        };
      }
      setFileStates(states);

      // Second pass: fetch content for each non-missing file in parallel
      const contentFetches = result.files
        .filter((f) => !f.missing)
        .map(async (file) => {
          const got = await getAgentFileViaGateway(agentId, file.name);
          if (got.ok && got.content != null) {
            return { name: file.name, content: got.content };
          }
          return null;
        });
      const fetched = await Promise.all(contentFetches);
      setFileStates((prev) => {
        const updated = { ...prev };
        for (const item of fetched) {
          if (item && updated[item.name]) {
            updated[item.name] = {
              ...updated[item.name],
              content: item.content,
              original: item.content,
            };
          }
        }
        return updated;
      });
    }
    setLoadingFiles(false);
  }, [agentId]);

  // Reload files when connection becomes ready or agentId changes
  useEffect(() => {
    if (status === "connected") {
      loadFiles();
    }
  }, [loadFiles, status]);

  const handleContentChange = (fileName: string, content: string) => {
    setFileStates((prev) => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        content,
        dirty: content !== prev[fileName]?.original,
        syncStatus: content !== prev[fileName]?.original ? "pending" : "synced",
      },
    }));
  };

  const handleSaveFile = async (fileName: string, summary?: string) => {
    const state = fileStates[fileName];
    if (!state || !state.dirty) return;

    setFileStates((prev) => ({
      ...prev,
      [fileName]: { ...prev[fileName], saving: true },
    }));

    const result = await setAgentFileViaGateway(agentId, fileName, state.content);

    setFileStates((prev) => {
      const s = prev[fileName];
      const newVersion: FileVersion = {
        version: (s.versions.length ?? 0) + 1,
        content: s.original,
        savedAt: Date.now(),
        summary,
      };
      return {
        ...prev,
        [fileName]: {
          ...s,
          saving: false,
          dirty: false,
          original: state.content,
          lastSavedAt: Date.now(),
          syncStatus: result.ok ? "pending" : "desync",
          versions: [...s.versions, newVersion],
        },
      };
    });
  };

  const handleRevertFile = (fileName: string, version: FileVersion) => {
    handleContentChange(fileName, version.content);
  };

  // Export agent config as JSON
  const handleExport = async () => {
    const result = await listAgentFilesViaGateway(agentId);
    const exportData = {
      exportedAt: new Date().toISOString(),
      agent: {
        id: agentId,
        name: agent?.name,
        role: agent?.role,
        model: agent?.model,
      },
      files: result.ok
        ? Object.fromEntries(
            (result.files ?? []).map((f) => [f.name, f.content ?? ""]),
          )
        : {},
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agent?.name ?? agentId}-agent-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import agent files from exported JSON
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as { files?: Record<string, string> };
        if (data.files) {
          for (const [fileName, content] of Object.entries(data.files)) {
            if (typeof content === "string") {
              await setAgentFileViaGateway(agentId, fileName, content);
            }
          }
          await loadFiles();
        }
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "File upload failed");
      }
    };
    input.click();
  };

  if (!agent) {
    if (!notFoundConfirmed) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-pulse">
            <Mascot size="lg" glow />
          </div>
          <p className="text-foreground-muted text-sm">Carregando agente…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <AlertTriangle size={18} className="text-danger" />
        <p className="text-foreground-muted text-sm">Agente não encontrado: <span className="font-mono text-foreground">{agentId}</span></p>
      </div>
    );
  }

  const currentTab = TABS.find((t) => t.id === activeTab);
  const TabIcon = currentTab?.icon ?? Crown;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2
            className="text-xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {agent.name}
          </h2>
          <AgentStatusBadge status={agent.status} />
          {agentProjects.length > 0 && (
            <div className="flex items-center gap-1">
              {agentProjects.slice(0, 2).map((p) => {
                const member = p.roster.find((m) => m.agentId === agentId);
                return (
                  <span key={p.id} className="rounded-md bg-surface-strong border border-line px-2 py-0.5 text-[10px] text-foreground-muted">
                    {p.name}{member?.role === "lead" ? " · Lead" : ""}
                  </span>
                );
              })}
              {agentProjects.length > 2 && (
                <span className="text-[10px] text-foreground-muted">+{agentProjects.length - 2}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadFiles}
            disabled={loadingFiles}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-strong text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <RefreshCw size={12} className={loadingFiles ? "animate-spin" : ""} />
            {loadingFiles ? "Syncing..." : "Sync files"}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-strong text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <Download size={12} />
            Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line bg-surface-strong text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <Upload size={12} />
            Import
          </button>
          <span className="mono text-xs text-foreground-muted/50">{agent.id.slice(0, 16)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === id
                ? "border-accent text-foreground"
                : "border-transparent text-foreground-muted hover:text-foreground"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "identity" && (
          <TabIdentity
            agentId={agentId}
            fileStates={fileStates}
            onContentChange={handleContentChange}
            onSaveFile={handleSaveFile}
            onRevertFile={handleRevertFile}
          />
        )}
        {activeTab === "soul" && (
          <TabSoul
            agentId={agentId}
            fileStates={fileStates}
            onContentChange={handleContentChange}
            onSaveFile={handleSaveFile}
            onRevertFile={handleRevertFile}
          />
        )}
        {activeTab === "tools" && (
          <TabTools
            agentId={agentId}
            fileStates={fileStates}
            onContentChange={handleContentChange}
            onSaveFile={handleSaveFile}
            onRevertFile={handleRevertFile}
          />
        )}
        {activeTab === "model" && <TabModel agentId={agentId} />}
        {activeTab === "sessions" && (
          <AgentSessionList sessions={agentSessions} />
        )}
        {activeTab === "logs" && <TabLogs agentId={agentId} />}
      </div>
    </div>
  );
}
