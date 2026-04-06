"use client";

import { useEffect, useState, useCallback } from "react";
import { Code, Scale, BarChart3, Megaphone, ShoppingCart, Calculator, Heart, GraduationCap, Ticket, Building2, ChevronDown, Loader2 } from "lucide-react";
import { useMCFetch } from "@/hooks/use-mc-fetch";

const ORG_TYPE_META: Record<string, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  software_dev: { label: "Tecnologia", Icon: Code },
  legal: { label: "Juridico", Icon: Scale },
  consulting: { label: "Consultoria", Icon: BarChart3 },
  marketing_agency: { label: "Marketing", Icon: Megaphone },
  retail_ecommerce: { label: "Varejo", Icon: ShoppingCart },
  accounting: { label: "Contabilidade", Icon: Calculator },
  healthcare: { label: "Saude", Icon: Heart },
  education: { label: "Educacao", Icon: GraduationCap },
  lottery_agency: { label: "Loterica", Icon: Ticket },
  general: { label: "Outro", Icon: Building2 },
};

const SEARCH_PRIORITY_OPTIONS = [
  { value: 0.65, label: "Busca semantica", description: "Entende o significado (melhor para codigo)" },
  { value: 0.50, label: "Balanceado", description: "Mix de significado + palavras-chave" },
  { value: 0.35, label: "Palavras-chave", description: "Termos exatos (melhor para juridico, contabil)" },
];

const TEMPORAL_OPTIONS = [
  { value: "none", label: "Sem preferencia", description: "Todo conteudo e igual" },
  { value: "light", label: "Leve", description: "Boost sutil para recentes" },
  { value: "moderate", label: "Preferir recentes", description: "Documentos recentes tem prioridade" },
  { value: "strong", label: "Sempre o mais recente", description: "Recentes dominam (normas, politicas)" },
];

interface Profile {
  orgType: string;
  orgDescription: string | null;
  retrievalVectorWeight: number;
  retrievalRrfK: number;
  retrievalRerankerEnabled: boolean;
  retrievalMaxChunks: number;
  retrievalMaxContextPct: number;
  temporalDecay: string;
  temporalExcludeSuperseded: boolean;
  corpusLanguages: string[];
  primaryFtsLanguage: string;
  versioningMode: string;
  autoTuneEnabled: boolean;
}

export function KnowledgeProfile({ canManage }: { canManage: boolean }) {
  const mcFetch = useMCFetch();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await mcFetch("/api/knowledge-profile");
      if (res.ok) {
        const { data } = await res.json();
        setProfile(data);
      }
    } catch {
      // Profile may not exist yet
    } finally {
      setLoading(false);
    }
  }, [mcFetch]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSave(updates: Partial<Profile>) {
    if (!canManage) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await mcFetch("/api/knowledge-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const { data } = await res.json();
        setProfile(data);
        setSuccess("Saved");
        setTimeout(() => setSuccess(""), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Loader2 size={14} className="animate-spin" /> Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 text-center">
        <p className="text-sm text-foreground-soft">No knowledge profile configured yet.</p>
        <p className="mt-1 text-xs text-foreground-muted">Complete the onboarding to set up your profile.</p>
      </div>
    );
  }

  const orgMeta = ORG_TYPE_META[profile.orgType] ?? ORG_TYPE_META.general;
  const OrgIcon = orgMeta.Icon;

  // Find closest search priority
  const closestPriority = SEARCH_PRIORITY_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr.value - profile.retrievalVectorWeight) < Math.abs(prev.value - profile.retrievalVectorWeight) ? curr : prev
  );

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Knowledge Profile</h2>
            <p className="text-xs text-foreground-muted">How Rikuchan organizes and searches your content</p>
          </div>
          <div className="flex items-center gap-2">
            {success && <span className="text-xs text-emerald-400">{success}</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
            {saving && <Loader2 size={14} className="animate-spin text-foreground-muted" />}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Org Type */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <OrgIcon size={20} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{orgMeta.label}</p>
            {profile.orgDescription && (
              <p className="text-xs text-foreground-muted">{profile.orgDescription}</p>
            )}
          </div>
        </div>

        {/* Search Priority */}
        <div>
          <label className="text-sm font-medium text-foreground">Search priority</label>
          <div className="mt-2 space-y-1.5">
            {SEARCH_PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={!canManage}
                onClick={() => handleSave({ retrievalVectorWeight: opt.value } as Partial<Profile>)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  closestPriority.value === opt.value
                    ? "border-accent bg-accent/[0.06]"
                    : "border-line hover:border-line-strong"
                } disabled:opacity-60`}
              >
                <div>
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-foreground-muted">{opt.description}</p>
                </div>
                <span className={`h-3 w-3 rounded-full border-2 ${
                  closestPriority.value === opt.value ? "border-accent bg-accent" : "border-line"
                }`} />
              </button>
            ))}
          </div>
        </div>

        {/* Temporal Preference */}
        <div>
          <label className="text-sm font-medium text-foreground">Temporal preference</label>
          <select
            value={profile.temporalDecay}
            disabled={!canManage}
            onChange={(e) => handleSave({ temporalDecay: e.target.value } as Partial<Profile>)}
            className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground disabled:opacity-60"
          >
            {TEMPORAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
            ))}
          </select>
        </div>

        {/* Superseded toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={profile.temporalExcludeSuperseded}
            disabled={!canManage}
            onChange={(e) => handleSave({ temporalExcludeSuperseded: e.target.checked } as Partial<Profile>)}
            className="h-4 w-4 rounded border-line accent-accent"
          />
          <span className="text-sm text-foreground">Hide documents replaced by newer versions</span>
        </label>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground transition"
        >
          <ChevronDown size={14} className={`transition ${showAdvanced ? "rotate-180" : ""}`} />
          Advanced settings
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-md border border-line bg-surface-strong p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground-muted">Vector weight (0-1)</label>
                <input type="number" step="0.05" min="0" max="1"
                  value={profile.retrievalVectorWeight}
                  disabled={!canManage}
                  onChange={(e) => handleSave({ retrievalVectorWeight: parseFloat(e.target.value) } as Partial<Profile>)}
                  className="mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm disabled:opacity-60" />
              </div>
              <div>
                <label className="text-xs text-foreground-muted">RRF k (10-200)</label>
                <input type="number" min="10" max="200"
                  value={profile.retrievalRrfK}
                  disabled={!canManage}
                  onChange={(e) => handleSave({ retrievalRrfK: parseInt(e.target.value) } as Partial<Profile>)}
                  className="mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm disabled:opacity-60" />
              </div>
              <div>
                <label className="text-xs text-foreground-muted">Max chunks per query</label>
                <input type="number" min="1" max="20"
                  value={profile.retrievalMaxChunks}
                  disabled={!canManage}
                  onChange={(e) => handleSave({ retrievalMaxChunks: parseInt(e.target.value) } as Partial<Profile>)}
                  className="mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm disabled:opacity-60" />
              </div>
              <div>
                <label className="text-xs text-foreground-muted">Versioning</label>
                <select
                  value={profile.versioningMode}
                  disabled={!canManage}
                  onChange={(e) => handleSave({ versioningMode: e.target.value } as Partial<Profile>)}
                  className="mt-1 w-full rounded border border-line bg-surface px-2 py-1.5 text-sm disabled:opacity-60">
                  <option value="latest_only">Latest only</option>
                  <option value="latest_preferred">Latest preferred</option>
                  <option value="all_equal">All equal</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                checked={profile.autoTuneEnabled}
                disabled={!canManage}
                onChange={(e) => handleSave({ autoTuneEnabled: e.target.checked } as Partial<Profile>)}
                className="h-4 w-4 rounded border-line accent-accent" />
              <span className="text-foreground">Auto-tune (adjust weights based on corpus)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
