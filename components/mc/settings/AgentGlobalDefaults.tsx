"use client";

import { useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { InfoTooltip } from "@/components/mc/ui/InfoTooltip";
import { Combobox } from "@/components/mc/ui/Combobox";
import { TimezoneCombobox } from "@/components/mc/ui/TimezoneCombobox";
import { patchAgentDefaults } from "@/lib/mc/agent-files";
import { useGatewayStore } from "@/lib/mc/gateway-store";

// ─── State ───────────────────────────────────────────────────────────────────

interface GlobalDefaultsState {
  // Behavior
  thinkingDefault: string;
  verboseDefault: string;
  elevatedDefault: string;
  typingMode: string;
  typingIntervalSeconds: number | "";
  // Block Streaming
  blockStreamingDefault: string;
  blockStreamingBreak: string;
  blockStreamingChunk: string;
  blockStreamingCoalesce: string;
  // Context & Bootstrap
  contextTokens: number | "";
  bootstrapMaxChars: number | "";
  bootstrapTotalMaxChars: number | "";
  bootstrapTruncWarning: string;
  skipBootstrap: boolean;
  // Performance
  maxConcurrent: number | "";
  timeoutSeconds: number | "";
  // Media
  imageMaxDimension: number | "";
  imageModel: string;
  mediaMaxMb: number | "";
  pdfMaxSizeMb: number | "";
  pdfMaxPages: number | "";
  pdfModel: string;
  // Envelope & Time
  envelopeTimestamp: string;
  envelopeElapsed: string;
  envelopeTimezone: string;
  userTimezone: string;
  timeFormat: string;
  // Workspace
  workspace: string;
  repoRoot: string;
  // Advanced JSON
  heartbeatJson: string;
  compactionJson: string;
  contextPruningJson: string;
  cliBackendsJson: string;
  embeddedPiJson: string;
  modelsJson: string;
}

const EMPTY: GlobalDefaultsState = {
  thinkingDefault: "", verboseDefault: "", elevatedDefault: "",
  typingMode: "", typingIntervalSeconds: "",
  blockStreamingDefault: "", blockStreamingBreak: "",
  blockStreamingChunk: "", blockStreamingCoalesce: "",
  contextTokens: "", bootstrapMaxChars: "", bootstrapTotalMaxChars: "",
  bootstrapTruncWarning: "", skipBootstrap: false,
  maxConcurrent: "", timeoutSeconds: "",
  imageMaxDimension: "", imageModel: "", mediaMaxMb: "",
  pdfMaxSizeMb: "", pdfMaxPages: "", pdfModel: "",
  envelopeTimestamp: "", envelopeElapsed: "",
  envelopeTimezone: "", userTimezone: "", timeFormat: "",
  workspace: "", repoRoot: "",
  heartbeatJson: "", compactionJson: "", contextPruningJson: "",
  cliBackendsJson: "", embeddedPiJson: "", modelsJson: "",
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mono text-[10px] uppercase tracking-widest text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.16em" }}>
      {children}
    </label>
  );
}

function FieldWithInfo({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <FieldLabel>{label}</FieldLabel>
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
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? "bg-accent" : "bg-surface-strong border border-line"}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, placeholder }: {
  value: number | ""; onChange: (v: number | "") => void; min?: number; max?: number; placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      placeholder={placeholder}
      className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
    />
  );
}

function SelectCombobox({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options.map((o) => ({ id: o.value, label: o.label }))}
      placeholder="Inherit default"
    />
  );
}

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
    <button type="button" onClick={onToggle} className="flex items-center justify-between w-full py-1">
      <span className="mono text-[10px] uppercase tracking-widest text-foreground-muted font-semibold">{label}</span>
      <ChevronDown size={13} strokeWidth={2.5} className={`text-foreground-muted/50 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentGlobalDefaults() {
  const isConnected = useGatewayStore((s) => s.status === "connected");
  const [state, setState] = useState<GlobalDefaultsState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof GlobalDefaultsState>(field: K, value: GlobalDefaultsState[K]) =>
    setState((prev) => ({ ...prev, [field]: value }));

  const [open, setOpen] = useState<Record<string, boolean>>({
    behavior: true, streaming: false, context: false,
    performance: false, media: false, envelope: false,
    workspace: false, advanced: false,
  });
  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const g: Record<string, unknown> = {};

    // behavior
    if (state.thinkingDefault)      g.thinkingDefault = state.thinkingDefault;
    if (state.verboseDefault)       g.verboseDefault = state.verboseDefault;
    if (state.elevatedDefault)      g.elevatedDefault = state.elevatedDefault;
    if (state.typingMode)           g.typingMode = state.typingMode;
    if (state.typingIntervalSeconds !== "") g.typingIntervalSeconds = state.typingIntervalSeconds;
    // block streaming
    if (state.blockStreamingDefault) g.blockStreamingDefault = state.blockStreamingDefault;
    if (state.blockStreamingDefault === "on" && state.blockStreamingBreak)
      g.blockStreamingBreak = state.blockStreamingBreak;
    if (state.blockStreamingChunk)   { try { g.blockStreamingChunk = JSON.parse(state.blockStreamingChunk); } catch { g.blockStreamingChunk = state.blockStreamingChunk; } }
    if (state.blockStreamingCoalesce) { try { g.blockStreamingCoalesce = JSON.parse(state.blockStreamingCoalesce); } catch { g.blockStreamingCoalesce = state.blockStreamingCoalesce; } }
    // context & bootstrap
    if (state.contextTokens !== "")     g.contextTokens = state.contextTokens;
    if (state.bootstrapMaxChars !== "") g.bootstrapMaxChars = state.bootstrapMaxChars;
    if (state.bootstrapTotalMaxChars !== "") g.bootstrapTotalMaxChars = state.bootstrapTotalMaxChars;
    if (state.bootstrapTruncWarning)    g.bootstrapPromptTruncationWarning = state.bootstrapTruncWarning;
    if (state.skipBootstrap)            g.skipBootstrap = true;
    // performance
    if (state.maxConcurrent !== "") g.maxConcurrent = state.maxConcurrent;
    if (state.timeoutSeconds !== "") g.timeoutSeconds = state.timeoutSeconds;
    // media
    if (state.imageMaxDimension !== "") g.imageMaxDimensionPx = state.imageMaxDimension;
    if (state.imageModel) { try { g.imageModel = JSON.parse(state.imageModel); } catch { g.imageModel = state.imageModel; } }
    if (state.mediaMaxMb !== "")   g.mediaMaxMb = state.mediaMaxMb;
    if (state.pdfMaxSizeMb !== "") g.pdfMaxSizeMb = state.pdfMaxSizeMb;
    if (state.pdfMaxPages !== "")  g.pdfMaxPages = state.pdfMaxPages;
    if (state.pdfModel) { try { g.pdfModel = JSON.parse(state.pdfModel); } catch { g.pdfModel = state.pdfModel; } }
    // envelope & time
    if (state.envelopeTimestamp) g.envelopeTimestamp = state.envelopeTimestamp;
    if (state.envelopeElapsed)   g.envelopeElapsed = state.envelopeElapsed;
    if (state.envelopeTimezone)  g.envelopeTimezone = state.envelopeTimezone;
    if (state.userTimezone)      g.userTimezone = state.userTimezone;
    if (state.timeFormat)        g.timeFormat = state.timeFormat;
    // workspace
    if (state.workspace) g.workspace = state.workspace;
    if (state.repoRoot)  g.repoRoot = state.repoRoot;
    // advanced JSON
    if (state.heartbeatJson)     { try { g.heartbeat = JSON.parse(state.heartbeatJson); } catch {} }
    if (state.compactionJson)    { try { g.compaction = JSON.parse(state.compactionJson); } catch {} }
    if (state.contextPruningJson) { try { g.contextPruning = JSON.parse(state.contextPruningJson); } catch {} }
    if (state.cliBackendsJson)   { try { g.cliBackends = JSON.parse(state.cliBackendsJson); } catch {} }
    if (state.embeddedPiJson)    { try { g.embeddedPi = JSON.parse(state.embeddedPiJson); } catch {} }
    if (state.modelsJson)        { try { g.models = JSON.parse(state.modelsJson); } catch {} }

    const result = await patchAgentDefaults({ agentId: "", perAgent: {}, globalDefaults: g });

    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const textInput = (field: keyof GlobalDefaultsState, placeholder: string, mono = false) => (
    <input
      type="text"
      value={state[field] as string}
      onChange={(e) => set(field, e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 ${mono ? "font-mono" : ""}`}
    />
  );

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Agent Global Defaults</h3>
          <p className="text-[11px] text-foreground-muted mt-0.5">
            Applied to <code className="font-mono">agents.defaults</code> — affects all agents. Leave fields empty to keep current values.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isConnected}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
        >
          <Save size={13} />
          {saving ? "Saving..." : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {!isConnected && (
        <div className="px-6 py-3 bg-warning/5 border-b border-warning/15">
          <p className="text-[11px] text-warning/80">Gateway not connected — connect to save changes.</p>
        </div>
      )}

      {error && (
        <div className="px-6 py-3 bg-danger/5 border-b border-danger/15">
          <p className="text-[11px] text-danger">{error}</p>
        </div>
      )}

      <div className="divide-y divide-line">

        {/* ── Behavior ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Behavior" open={open.behavior} onToggle={() => toggle("behavior")} />
          {open.behavior && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <FieldWithInfo label="Thinking" tooltip="How deeply the model reasons before answering. Higher = smarter but slower. 'Adaptive' lets the model decide.">
                <SelectCombobox value={state.thinkingDefault} onChange={(v) => set("thinkingDefault", v)} options={[
                  { value: "off", label: "Off" }, { value: "minimal", label: "Minimal" },
                  { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
                  { value: "high", label: "High" }, { value: "xhigh", label: "Extra High" },
                  { value: "adaptive", label: "Adaptive" },
                ]} />
              </FieldWithInfo>
              <FieldWithInfo label="Verbose" tooltip="How much detail agents include in replies. 'Full' shows tool traces and reasoning steps.">
                <SelectCombobox value={state.verboseDefault} onChange={(v) => set("verboseDefault", v)} options={[
                  { value: "off", label: "Off" }, { value: "on", label: "On" }, { value: "full", label: "Full" },
                ]} />
              </FieldWithInfo>
              <FieldWithInfo label="Elevated" tooltip="Permission level for privileged actions (exec, write). 'Ask' prompts the user each time.">
                <SelectCombobox value={state.elevatedDefault} onChange={(v) => set("elevatedDefault", v)} options={[
                  { value: "off", label: "Off" }, { value: "on", label: "On" },
                  { value: "ask", label: "Ask" }, { value: "full", label: "Full" },
                ]} />
              </FieldWithInfo>
              <FieldWithInfo label="Typing Mode" tooltip="When to show a typing indicator to the user. 'Message' shows it while the agent is generating.">
                <SelectCombobox value={state.typingMode} onChange={(v) => set("typingMode", v)} options={[
                  { value: "never", label: "Never" }, { value: "instant", label: "Instant" },
                  { value: "thinking", label: "Thinking" }, { value: "message", label: "Message" },
                ]} />
              </FieldWithInfo>
              <FieldWithInfo label="Typing Interval (s)" tooltip="How often (seconds) the typing indicator refreshes while generating. Lower = more frequent.">
                <NumberInput value={state.typingIntervalSeconds} onChange={(v) => set("typingIntervalSeconds", v)} min={1} placeholder="Default" />
              </FieldWithInfo>
            </div>
          )}
        </div>

        {/* ── Block Streaming ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Block Streaming" open={open.streaming} onToggle={() => toggle("streaming")} />
          {open.streaming && (
            <div className="space-y-4 pt-4">
              <FieldWithInfo label="Block Streaming" tooltip="Buffers replies into a complete message instead of streaming word-by-word. Useful for channels that don't support live streaming.">
                <SelectCombobox value={state.blockStreamingDefault} onChange={(v) => set("blockStreamingDefault", v)} options={[
                  { value: "off", label: "Off — stream live" }, { value: "on", label: "On — buffer full reply" },
                ]} />
              </FieldWithInfo>
              {state.blockStreamingDefault === "on" && (
                <>
                  <FieldWithInfo label="Break Point" tooltip="When to flush the buffer. 'text_end' flushes after each text block, 'message_end' waits for the full message.">
                    <SelectCombobox value={state.blockStreamingBreak} onChange={(v) => set("blockStreamingBreak", v)} options={[
                      { value: "text_end", label: "Text End" }, { value: "message_end", label: "Message End" },
                    ]} />
                  </FieldWithInfo>
                  <FieldWithInfo label="Chunk Config (JSON)" tooltip="Splits long buffered replies into smaller parts. Accepts a JSON object.">
                    <JsonTextarea value={state.blockStreamingChunk} onChange={(v) => set("blockStreamingChunk", v)} placeholder='{ "maxChars": 2000 }' />
                  </FieldWithInfo>
                  <FieldWithInfo label="Coalesce Config (JSON)" tooltip="Merges multiple quick consecutive blocks into one before sending.">
                    <JsonTextarea value={state.blockStreamingCoalesce} onChange={(v) => set("blockStreamingCoalesce", v)} placeholder='{ "idleMs": 300 }' />
                  </FieldWithInfo>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Context & Bootstrap ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Context & Bootstrap" open={open.context} onToggle={() => toggle("context")} />
          {open.context && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <FieldWithInfo label="Context Tokens" tooltip="Caps the context window. Leave empty for model maximum. Reduces cost on smaller agents.">
                <NumberInput value={state.contextTokens} onChange={(v) => set("contextTokens", v)} min={1000} placeholder="Model max" />
              </FieldWithInfo>
              <FieldWithInfo label="Bootstrap Max Chars" tooltip="Max chars from each workspace file injected into the system prompt. Default: 20,000.">
                <NumberInput value={state.bootstrapMaxChars} onChange={(v) => set("bootstrapMaxChars", v)} min={0} placeholder="20000" />
              </FieldWithInfo>
              <FieldWithInfo label="Bootstrap Total Chars" tooltip="Total char budget across ALL workspace files in the system prompt. Default: 150,000.">
                <NumberInput value={state.bootstrapTotalMaxChars} onChange={(v) => set("bootstrapTotalMaxChars", v)} min={0} placeholder="150000" />
              </FieldWithInfo>
              <FieldWithInfo label="Truncation Warning" tooltip="Whether to warn the agent when workspace files were truncated due to size limits.">
                <SelectCombobox value={state.bootstrapTruncWarning} onChange={(v) => set("bootstrapTruncWarning", v)} options={[
                  { value: "off", label: "Off" }, { value: "once", label: "Once (default)" }, { value: "always", label: "Always" },
                ]} />
              </FieldWithInfo>
              <div className="col-span-2">
                <FieldWithInfo label="Skip Bootstrap" tooltip="Prevents workspace files from being injected into the system prompt. Good for lightweight or single-task agents.">
                  <div className="flex items-center gap-2 mt-1">
                    <Toggle checked={state.skipBootstrap} onChange={(v) => set("skipBootstrap", v)} />
                    <span className="text-xs text-foreground-muted">{state.skipBootstrap ? "Bootstrap skipped" : "Bootstrap injected (default)"}</span>
                  </div>
                </FieldWithInfo>
              </div>
            </div>
          )}
        </div>

        {/* ── Performance ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Performance" open={open.performance} onToggle={() => toggle("performance")} />
          {open.performance && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <FieldWithInfo label="Max Concurrent" tooltip="Max simultaneous sessions per agent. Default: 1. Increase for high-volume agents.">
                <NumberInput value={state.maxConcurrent} onChange={(v) => set("maxConcurrent", v)} min={1} max={20} placeholder="1" />
              </FieldWithInfo>
              <FieldWithInfo label="Timeout (seconds)" tooltip="Auto-cancels a session after this many seconds. Leave empty for no timeout.">
                <NumberInput value={state.timeoutSeconds} onChange={(v) => set("timeoutSeconds", v)} min={0} placeholder="No timeout" />
              </FieldWithInfo>
            </div>
          )}
        </div>

        {/* ── Media ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Media & Files" open={open.media} onToggle={() => toggle("media")} />
          {open.media && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <FieldWithInfo label="Image Max Dimension (px)" tooltip="Images larger than this are resized before being sent to the model. Default: 1200px.">
                <NumberInput value={state.imageMaxDimension} onChange={(v) => set("imageMaxDimension", v)} min={64} placeholder="1200" />
              </FieldWithInfo>
              <FieldWithInfo label="Media Max (MB)" tooltip="Max size for any media file. Larger files are rejected.">
                <NumberInput value={state.mediaMaxMb} onChange={(v) => set("mediaMaxMb", v)} min={1} placeholder="Default" />
              </FieldWithInfo>
              <FieldWithInfo label="PDF Max Size (MB)" tooltip="Max PDF size the agent can process. Default: 10 MB.">
                <NumberInput value={state.pdfMaxSizeMb} onChange={(v) => set("pdfMaxSizeMb", v)} min={1} placeholder="10" />
              </FieldWithInfo>
              <FieldWithInfo label="PDF Max Pages" tooltip="Max pages read from a PDF. Pages beyond this are ignored. Default: 20.">
                <NumberInput value={state.pdfMaxPages} onChange={(v) => set("pdfMaxPages", v)} min={1} placeholder="20" />
              </FieldWithInfo>
              <FieldWithInfo label="Image Model" tooltip="Override the model used for vision tasks. Leave empty to use the primary model.">
                {textInput("imageModel", '"claude-sonnet-4-6"', true)}
              </FieldWithInfo>
              <FieldWithInfo label="PDF Model" tooltip="Override the model that processes PDFs. Leave empty to use the primary model.">
                {textInput("pdfModel", '"claude-sonnet-4-6"', true)}
              </FieldWithInfo>
            </div>
          )}
        </div>

        {/* ── Envelope & Time ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Envelope & Time" open={open.envelope} onToggle={() => toggle("envelope")} />
          {open.envelope && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-10">
                <FieldWithInfo label="Envelope Timestamp" tooltip="Adds the current date/time to every message sent to the agent.">
                  <div className="flex items-center gap-2 mt-1">
                    <Toggle checked={state.envelopeTimestamp !== "off"} onChange={(v) => set("envelopeTimestamp", v ? "on" : "off")} />
                    <span className="text-xs text-foreground-muted">{state.envelopeTimestamp === "off" ? "Off" : "On (default)"}</span>
                  </div>
                </FieldWithInfo>
                <FieldWithInfo label="Envelope Elapsed" tooltip="Adds time elapsed since session start to every message.">
                  <div className="flex items-center gap-2 mt-1">
                    <Toggle checked={state.envelopeElapsed !== "off"} onChange={(v) => set("envelopeElapsed", v ? "on" : "off")} />
                    <span className="text-xs text-foreground-muted">{state.envelopeElapsed === "off" ? "Off" : "On (default)"}</span>
                  </div>
                </FieldWithInfo>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FieldWithInfo label="Envelope Timezone" tooltip="Timezone for message envelope timestamps. Options: utc, local, user, or IANA string.">
                  <TimezoneCombobox value={state.envelopeTimezone} onChange={(v) => set("envelopeTimezone", v)} />
                </FieldWithInfo>
                <FieldWithInfo label="User Timezone" tooltip="The user's local timezone shown to the agent for formatting times correctly.">
                  <TimezoneCombobox value={state.userTimezone} onChange={(v) => set("userTimezone", v)} placeholder="e.g. America/Sao_Paulo" />
                </FieldWithInfo>
                <FieldWithInfo label="Time Format" tooltip="12h or 24h clock format. 'Auto' follows system preferences.">
                  <SelectCombobox value={state.timeFormat} onChange={(v) => set("timeFormat", v)} options={[
                    { value: "auto", label: "Auto" }, { value: "12", label: "12h" }, { value: "24", label: "24h" },
                  ]} />
                </FieldWithInfo>
              </div>
            </div>
          )}
        </div>

        {/* ── Workspace ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Workspace & Paths" open={open.workspace} onToggle={() => toggle("workspace")} />
          {open.workspace && (
            <div className="grid grid-cols-1 gap-4 pt-4">
              <FieldWithInfo label="Workspace" tooltip="Default working directory for agent file tools. Set when running from wrappers.">
                {textInput("workspace", "/data/workspace", true)}
              </FieldWithInfo>
              <FieldWithInfo label="Repo Root" tooltip="Root of the code repository shown to the agent in its system prompt.">
                {textInput("repoRoot", "/home/user/project", true)}
              </FieldWithInfo>
            </div>
          )}
        </div>

        {/* ── Advanced (JSON) ── */}
        <div className="px-6 py-4">
          <SectionHeader label="Advanced (JSON)" open={open.advanced} onToggle={() => toggle("advanced")} />
          {open.advanced && (
            <div className="space-y-4 pt-4">
              <p className="text-[11px] text-foreground-muted">Raw JSON objects. Leave empty to keep current values. Invalid JSON is ignored on save.</p>
              <FieldWithInfo label="Heartbeat" tooltip="Periodic ping config: interval, prompt, active hours, target session.">
                <JsonTextarea value={state.heartbeatJson} onChange={(v) => set("heartbeatJson", v)} placeholder={'{ "every": "30m", "prompt": "Review your task board." }'} rows={4} />
              </FieldWithInfo>
              <FieldWithInfo label="Compaction" tooltip="How conversation history is compressed when it gets too long.">
                <JsonTextarea value={state.compactionJson} onChange={(v) => set("compactionJson", v)} placeholder={'{ "mode": "safeguard" }'} />
              </FieldWithInfo>
              <FieldWithInfo label="Context Pruning" tooltip="Removes old tool results from context to free up token space before it runs out.">
                <JsonTextarea value={state.contextPruningJson} onChange={(v) => set("contextPruningJson", v)} placeholder={'{ "mode": "cache-ttl", "ttl": "30m" }'} />
              </FieldWithInfo>
              <FieldWithInfo label="CLI Backends" tooltip="Override which CLI backend agents use to run commands.">
                <JsonTextarea value={state.cliBackendsJson} onChange={(v) => set("cliBackendsJson", v)} placeholder={'[{ "id": "default" }]'} />
              </FieldWithInfo>
              <FieldWithInfo label="Embedded Pi" tooltip="Project settings injection config. Controls how project-level settings are trusted.">
                <JsonTextarea value={state.embeddedPiJson} onChange={(v) => set("embeddedPiJson", v)} placeholder={'{ "projectSettingsPolicy": "trusted" }'} />
              </FieldWithInfo>
              <FieldWithInfo label="Models Catalog" tooltip="Custom set of models available to all agents, with optional aliases and fallbacks.">
                <JsonTextarea value={state.modelsJson} onChange={(v) => set("modelsJson", v)} placeholder={'[{ "id": "claude-sonnet-4-6", "label": "Sonnet" }]'} rows={4} />
              </FieldWithInfo>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
