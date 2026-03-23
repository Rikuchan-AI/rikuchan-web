"use client";

import { useEffect, useMemo, useState } from "react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import {
  getHeartbeatModelGroups,
  HEARTBEAT_INTERVAL_OPTIONS,
  HEARTBEAT_TIMEOUT_OPTIONS,
} from "@/lib/mc/models";
import { syncHeartbeatDefaultsToGateway } from "@/lib/mc/heartbeat-integration";
import { toast } from "@/components/shared/toast";
import { Star, Info, ChevronDown, Search } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import { SkeletonList } from "@/components/shared/skeleton";
import { getFreeModelsFromConfig } from "@/lib/mc/agent-files";

export function HeartbeatModelSelector() {
  const heartbeatConfig = useGatewayStore((s) => s.heartbeatConfig);
  const gatewayModels = useGatewayStore((s) => s.availableModels);
  const connectionStatus = useGatewayStore((s) => s.status);
  const expectGatewayRestart = useGatewayStore((s) => s.expectGatewayRestart);
  const clearExpectedGatewayRestart = useGatewayStore((s) => s.clearExpectedGatewayRestart);
  const setHeartbeatModel = useGatewayStore((s) => s.setHeartbeatModel);
  const setHeartbeatInterval = useGatewayStore((s) => s.setHeartbeatInterval);
  const setHeartbeatTimeout = useGatewayStore((s) => s.setHeartbeatTimeout);

  const [selected, setSelected] = useState(heartbeatConfig.model);
  const [interval, setIntervalMs] = useState(heartbeatConfig.intervalMs);
  const [timeout, setTimeoutMs] = useState(heartbeatConfig.timeoutMs);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [configFreeGroups, setConfigFreeGroups] = useState<Array<{ provider: string; models: { id: string; label: string; note?: string; recommended?: boolean; rateLimit?: string }[] }> | null>(null);

  useEffect(() => {
    if (connectionStatus !== "connected") { setConfigFreeGroups(null); return; }
    setConfigFreeGroups(null);
    getFreeModelsFromConfig().then((res) => {
      if (res.ok && res.groups) {
        setConfigFreeGroups(res.groups.map((g) => ({
          provider: g.provider,
          models: g.models.map((m) => ({ id: `${g.provider}/${m.id}`, label: m.name })),
        })));
      } else {
        setConfigFreeGroups([]);
      }
    });
  }, [connectionStatus]);

  const modelGroups = useMemo(() => {
    // null = still loading, don't show fallback yet
    if (configFreeGroups === null) return [];
    if (configFreeGroups.length > 0) return configFreeGroups;
    // config returned empty (no free models defined) → fallback to hardcoded
    return getHeartbeatModelGroups([]);
  }, [configFreeGroups]);

  const filteredModelGroups = useMemo(() => {
    if (!search.trim()) return modelGroups;
    const q = search.toLowerCase();
    return modelGroups
      .map((g) => ({ ...g, models: g.models.filter((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)) }))
      .filter((g) => g.models.length > 0);
  }, [modelGroups, search]);
  const availableModelIds = useMemo(
    () => modelGroups.flatMap((group) => group.models.map((model) => model.id)),
    [modelGroups]
  );
  const hasSelectableModels = availableModelIds.length > 0;

  useEffect(() => {
    if (availableModelIds.length > 0 && !availableModelIds.includes(selected)) {
      setSelected(availableModelIds[0]);
    }
  }, [availableModelIds, selected]);

  const handleSave = async () => {
    setSaving(true);

    if (connectionStatus === "connected") {
      expectGatewayRestart("heartbeat-model-update");
      const result = await syncHeartbeatDefaultsToGateway({
        modelRef: selected,
        intervalMs: interval,
      });

      if (!result.ok) {
        clearExpectedGatewayRestart();
        setSaving(false);
        toast("error", `Falha ao sincronizar heartbeat no gateway: ${result.error ?? "erro desconhecido"}`);
        return;
      }
    }

    setHeartbeatModel(selected);
    setHeartbeatInterval(interval);
    setHeartbeatTimeout(timeout);
    setSaving(false);
    toast(
      "success",
      connectionStatus === "connected"
        ? `Heartbeat sincronizado. O OpenClaw vai reiniciar para aplicar ${selected}`
        : `Heartbeat salvo localmente com ${selected}`
    );
  };

  const handleCancel = () => {
    setSelected(heartbeatConfig.model);
    setIntervalMs(heartbeatConfig.intervalMs);
    setTimeoutMs(heartbeatConfig.timeoutMs);
  };

  const beatsPerDay = Math.floor(86400 / (interval / 1000));
  const beatsPerDayLabel = new Intl.NumberFormat("en-US").format(beatsPerDay);

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="text-xl">💓</span>
          <div>
            <h3
              className="text-base font-semibold tracking-[-0.03em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Heartbeat Model
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              Modelo usado por agents para status check e keep-alive.
            </p>
          </div>
        </div>
        <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.06em] bg-accent-soft text-accent border border-accent/15">
          Free Only
        </span>
      </div>

      <div className="p-5">
        {/* Frequency + Timeout */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
              Frequência
            </label>
            <Combobox
              value={String(interval)}
              onChange={(v) => setIntervalMs(Number(v))}
              options={HEARTBEAT_INTERVAL_OPTIONS.map((o) => ({ id: String(o.value), label: o.label }))}
              placeholder="Select interval"
            />
          </div>
          <div>
            <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
              Timeout
            </label>
            <Combobox
              value={String(timeout)}
              onChange={(v) => setTimeoutMs(Number(v))}
              options={HEARTBEAT_TIMEOUT_OPTIONS.map((o) => ({ id: String(o.value), label: o.label }))}
              placeholder="Select timeout"
            />
          </div>
        </div>

        {/* Model list */}
        <div className="rounded-lg border border-line overflow-hidden mb-4">
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
          {!collapsed && (configFreeGroups === null ? (
            <div className="px-4 py-3"><SkeletonList count={4} /></div>
          ) : hasSelectableModels ? filteredModelGroups.map((group, gi) => (
            <div key={group.provider}>
              {gi > 0 && <div className="border-t border-line" />}
              <div className="px-4 py-2 bg-surface-muted">
                <span className="mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>
                  {group.provider}
                </span>
              </div>
              {group.models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  role="radio"
                  aria-checked={selected === model.id}
                  onClick={() => setSelected(model.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors border-t border-line/50 ${
                    selected === model.id ? "bg-accent-soft" : "hover:bg-surface-strong"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        selected === model.id ? "border-accent bg-accent" : "border-line-strong"
                      }`}
                    >
                      {selected === model.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${selected === model.id ? "text-accent font-medium" : "text-foreground"}`}>
                          {model.label}
                        </span>
                        {model.recommended && (
                          <Star size={11} className="text-warm flex-shrink-0" fill="currentColor" aria-label="Recommended" />
                        )}
                      </div>
                      {model.note && (
                        <p className="text-xs text-foreground-muted truncate">{model.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="mono text-xs text-accent">Free</p>
                    {model.rateLimit && (
                      <p className="mono text-xs text-foreground-muted">{model.rateLimit}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )) : (
            <div className="px-4 py-5 text-sm text-foreground-muted">
              {gatewayModels.length > 0
                ? "Nenhum modelo com custo 0 encontrado no gateway."
                : "Nenhum modelo disponível para heartbeat."}
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-md bg-surface-muted border border-line px-4 py-3 mb-4">
          <Info size={14} className="text-foreground-muted flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground-muted leading-relaxed">
            Cada agente executa{" "}
            <span className="text-foreground font-medium">~{beatsPerDayLabel} heartbeats/dia</span>{" "}
            (a {HEARTBEAT_INTERVAL_OPTIONS.find((o) => o.value === interval)?.label ?? `${interval/1000}s`}).
            Com modelos pagos, isso custaria centavos por agente/dia.{" "}
            <span className="text-accent font-medium">Com modelos free: $0.</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasSelectableModels}
            className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar Alteração"}
          </button>
        </div>
      </div>
    </div>
  );
}
