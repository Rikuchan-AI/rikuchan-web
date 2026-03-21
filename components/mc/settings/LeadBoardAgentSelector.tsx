"use client";

import { useMemo, useState } from "react";
import { Star, AlertTriangle, ChevronDown, Search } from "lucide-react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { MODEL_GROUPS, findModelProvider, isPremiumModel } from "@/lib/mc/models";
import { toast } from "@/components/shared/toast";

export function LeadBoardAgentSelector() {
  const leadBoardAgent = useGatewayStore((s) => s.leadBoardAgent);
  const setLeadBoardAgent = useGatewayStore((s) => s.setLeadBoardAgent);
  const gatewayModels = useGatewayStore((s) => s.availableModels);

  const [selected, setSelected] = useState(leadBoardAgent.model);
  const [customId, setCustomId] = useState("");
  const [customProvider, setCustomProvider] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  // Use gateway models if available, fallback to hardcoded
  const modelGroups = gatewayModels.length > 0 ? gatewayModels : MODEL_GROUPS;

  const filteredModelGroups = useMemo(() => {
    if (!search.trim()) return modelGroups;
    const q = search.toLowerCase();
    return modelGroups
      .map((g) => ({ ...g, models: g.models.filter((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)) }))
      .filter((g) => g.models.length > 0);
  }, [modelGroups, search]);

  const isCustom = !modelGroups.flatMap((g) => g.models).some((m) => m.id === selected);
  const wasExpensive = isPremiumModel(leadBoardAgent.model);
  const willBeCheaper = !isPremiumModel(selected) && wasExpensive;

  const handleSave = async () => {
    const finalId = isCustom ? customId : selected;
    const selectedModel = modelGroups.flatMap((group) => group.models).find((model) => model.id === finalId);
    const finalProvider = isCustom ? customProvider : selectedModel?.provider ?? findModelProvider(finalId);
    if (!finalId) return;

    setSaving(true);
    try {
      await setLeadBoardAgent(finalId, finalProvider);
      toast("success", `Lead Agent atualizado para ${finalId}`);
    } catch {
      toast("error", "Falha ao atualizar Lead Agent");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelected(leadBoardAgent.model);
    setCustomId("");
    setCustomProvider("");
  };

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="text-xl">🦞</span>
          <div>
            <h3
              className="text-base font-semibold tracking-[-0.03em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Lead Board Agent
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              O agente líder que coordena e delega para os demais.
            </p>
          </div>
        </div>
        <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-success-soft text-success border border-success/15">
          Active
        </span>
      </div>

      <div className="p-5">
        {/* Current model */}
        <div className="flex items-center gap-2 mb-4">
          <span className="mono text-xs text-foreground-muted" style={{ letterSpacing: "0.18em" }}>
            MODELO ATUAL:
          </span>
          <span className="mono text-xs font-semibold text-accent">{leadBoardAgent.model}</span>
          <span className="mono text-xs text-foreground-muted">[{leadBoardAgent.provider}]</span>
        </div>

        {/* Warning if downgrading */}
        {willBeCheaper && selected !== leadBoardAgent.model && (
          <div className="flex items-center gap-2 rounded-md bg-warm-soft border border-warning/20 px-3 py-2 mb-4">
            <AlertTriangle size={13} className="text-warning flex-shrink-0" />
            <p className="text-xs text-warning">
              Modelos mais rápidos podem reduzir a qualidade da coordenação
            </p>
          </div>
        )}

        {/* Model list */}
        <div className="rounded-lg border border-line overflow-hidden">
          {/* Search + collapse header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-line">
            <Search size={13} className="text-foreground-muted flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value.trim()) setCollapsed(false); }}
              placeholder="Buscar modelo..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center justify-center w-5 h-5 text-foreground-muted hover:text-foreground transition-colors"
            >
              <ChevronDown size={13} className={`transition-transform ${collapsed ? "-rotate-90" : ""}`} />
            </button>
          </div>
          {!collapsed && filteredModelGroups.map((group, gi) => (
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
                    selected === model.id
                      ? "bg-accent-soft"
                      : "hover:bg-surface-strong"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        selected === model.id
                          ? "border-accent bg-accent"
                          : "border-line-strong"
                      }`}
                    >
                      {selected === model.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="lead-model"
                      value={model.id}
                      checked={selected === model.id}
                      onChange={() => setSelected(model.id)}
                      className="sr-only"
                    />
                    <span className={`text-sm ${selected === model.id ? "text-accent font-medium" : "text-foreground"}`}>
                      {model.label}
                    </span>
                    {model.recommended && (
                      <Star size={11} className="text-warm" fill="currentColor" aria-label="Recommended" />
                    )}
                  </div>
                  {model.inputCost !== undefined && (
                    <span className="mono text-xs text-foreground-muted">
                      ${model.inputCost}/${model.outputCost} per MTok
                    </span>
                  )}
                </label>
              ))}
            </div>
          ))}

          {/* Custom option */}
          {!collapsed && (
            <div className="border-t border-line">
              <label
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isCustom && selected !== "" ? "bg-accent-soft" : "hover:bg-surface-strong"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isCustom ? "border-accent bg-accent" : "border-line-strong"
                  }`}
                >
                  {isCustom && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                  )}
                </div>
                <input
                  type="radio"
                  name="lead-model"
                  value="custom"
                  checked={isCustom}
                  onChange={() => setSelected("custom")}
                  className="sr-only"
                />
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => { setCustomId(e.target.value); setSelected("custom"); }}
                    placeholder="Custom Model ID…"
                    className="flex-1 rounded-md border border-line bg-surface-strong px-2 py-1 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  <input
                    type="text"
                    value={customProvider}
                    onChange={(e) => setCustomProvider(e.target.value)}
                    placeholder="Provider"
                    className="w-28 rounded-md border border-line bg-surface-strong px-2 py-1 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={handleCancel}
            className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (isCustom && !customId)}
            className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando…" : "Salvar Alteração"}
          </button>
        </div>
      </div>
    </div>
  );
}
