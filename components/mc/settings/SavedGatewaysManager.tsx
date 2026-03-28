"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, Server } from "lucide-react";
import { toast } from "@/components/shared/toast";
import type { SavedGateway } from "@/lib/mc/types";

const SETTINGS_KEY = "saved-gateways";

async function loadGateways(): Promise<SavedGateway[]> {
  try {
    const { getApiClient } = await import("@/lib/mc/api-client");
    const settings = await getApiClient().settings.get();
    const gateways = (settings?.preferences as Record<string, unknown>)?.[SETTINGS_KEY];
    return Array.isArray(gateways) ? gateways as SavedGateway[] : [];
  } catch {
    return [];
  }
}

async function persistGateways(gateways: SavedGateway[]): Promise<boolean> {
  try {
    const { getApiClient } = await import("@/lib/mc/api-client");
    await getApiClient().settings.update({ preferences: { [SETTINGS_KEY]: gateways } });
    return true;
  } catch {
    return false;
  }
}

export function SavedGatewaysManager() {
  const [gateways, setGateways] = useState<SavedGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGateways().then((data) => {
      setGateways(data);
      setLoading(false);
    });
  }, []);

  const resetForm = () => {
    setName("");
    setUrl("");
    setToken("");
    setShowTokenField(false);
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!name.trim() || !url.trim()) {
      toast("error", "Nome e URL são obrigatórios");
      return;
    }

    setSaving(true);
    const newGateway: SavedGateway = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      token: token.trim(),
    };
    const updated = [...gateways, newGateway];
    const ok = await persistGateways(updated);
    if (ok) {
      setGateways(updated);
      resetForm();
      toast("success", `Gateway "${newGateway.name}" salvo`);
    } else {
      toast("error", "Falha ao salvar gateway");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const gw = gateways.find((g) => g.id === id);
    const updated = gateways.filter((g) => g.id !== id);
    setSaving(true);
    const ok = await persistGateways(updated);
    if (ok) {
      setGateways(updated);
      toast("success", `Gateway "${gw?.name}" removido`);
    } else {
      toast("error", "Falha ao remover gateway");
    }
    setSaving(false);
  };

  const toggleTokenVisibility = (id: string) => {
    setVisibleTokens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div>
            <h3
              className="text-base font-semibold tracking-[-0.03em] text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Gateways Salvos
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              Gerencie conexões de gateway para uso rápido.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent-soft text-accent hover:bg-accent/20 transition-colors"
        >
          <Plus size={13} />
          Novo Gateway
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="rounded-lg border border-accent/20 bg-surface-muted p-4 space-y-3">
            <div>
              <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="Meu Gateway Local"
              />
            </div>
            <div>
              <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
                URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="ws://127.0.0.1:18789"
              />
            </div>
            <div>
              <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
                Auth Token
              </label>
              <div className="relative">
                <input
                  type={showTokenField ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 pr-10 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                  placeholder="Opcional"
                />
                <button
                  type="button"
                  aria-label="Toggle token visibility"
                  onClick={() => setShowTokenField((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  {showTokenField ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="h-8 px-3 rounded-md border border-line-strong text-xs font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving || !name.trim() || !url.trim()}
                className="h-8 px-3 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:bg-accent-deep transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {/* Gateway list */}
        {loading ? (
          <div className="text-sm text-foreground-muted py-4 text-center">Carregando...</div>
        ) : gateways.length === 0 && !showForm ? (
          <div className="text-center py-6">
            <Server size={24} className="mx-auto text-foreground-muted mb-2" />
            <p className="text-sm text-foreground-muted">Nenhum gateway salvo</p>
            <p className="text-xs text-foreground-muted mt-1">
              Adicione gateways para conectar rapidamente pelo dropdown de conexão.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {gateways.map((gw) => (
              <div
                key={gw.id}
                className="flex items-center justify-between rounded-md border border-line bg-surface-strong px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{gw.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-foreground-muted truncate">{gw.url}</span>
                    {gw.token && (
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility(gw.id)}
                        className="flex items-center gap-1 text-foreground-muted hover:text-foreground transition-colors"
                      >
                        {visibleTokens.has(gw.id) ? (
                          <>
                            <EyeOff size={11} />
                            <span className="text-[10px] font-mono">{gw.token}</span>
                          </>
                        ) : (
                          <>
                            <Eye size={11} />
                            <span className="text-[10px]">token</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(gw.id)}
                  disabled={saving}
                  className="flex items-center justify-center w-8 h-8 rounded-md text-foreground-muted hover:text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
                  aria-label={`Remover ${gw.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
