"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { getFreeModelsFromConfig, type FreeModelEntry } from "@/lib/mc/agent-files";
import { SkeletonList } from "@/components/shared/skeleton";

export function FreeModelsCatalog({ loading: _loading }: { data?: unknown; loading?: boolean }) {
  const status = useGatewayStore((s) => s.status);

  const [groups, setGroups] = useState<Array<{ provider: string; models: FreeModelEntry[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (status !== "connected") { setGroups([]); return; }
    setLoading(true);
    getFreeModelsFromConfig().then((res) => {
      setLoading(false);
      if (res.ok) setGroups(res.groups ?? []);
      else setError(res.error ?? "Erro ao carregar modelos");
    });
  }, [status]);

  const totalFree = groups.reduce((acc, g) => acc + g.models.length, 0);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        models: g.models.filter(
          (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.models.length > 0);
  }, [groups, search]);

  function handleSearch(v: string) {
    setSearch(v);
    if (v.trim()) setCollapsed(false);
  }

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.03em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Free Models Radar
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Modelos com custo 0 configurados no OpenClaw.
          </p>
        </div>
        <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-accent-soft text-accent border border-accent/15">
          {totalFree} free
        </span>
      </div>

      <div className="p-5">
        {loading ? (
          <SkeletonList count={4} />
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : status !== "connected" ? (
          <p className="text-sm text-foreground-muted">Gateway não conectado.</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhum modelo com custo 0 encontrado.</p>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-line">
              <Search size={13} className="text-foreground-muted flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
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
            {!collapsed && filteredGroups.map(({ provider, models }, index) => (
              <div key={provider}>
                {index > 0 && <div className="border-t border-line" />}
                <div className="px-4 py-2 bg-surface-muted flex items-center justify-between">
                  <span className="mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>
                    {provider}
                  </span>
                  <span className="mono text-[0.65rem] text-foreground-muted">{models.length}</span>
                </div>
                {models.map((model) => (
                  <div key={`${provider}-${model.id}`} className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line/50">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{model.name}</p>
                      <p className="text-xs text-foreground-muted truncate">
                        {model.id}
                        {model.contextWindow ? ` · ${model.contextWindow.toLocaleString("en-US")} ctx` : ""}
                        {model.maxTokens ? ` · ${model.maxTokens.toLocaleString("en-US")} max` : ""}
                      </p>
                    </div>
                    <span className="rounded-md px-2 py-0.5 text-[0.65rem] font-semibold bg-accent-soft text-accent border border-accent/15 flex-shrink-0">
                      free
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {!collapsed && filteredGroups.length === 0 && search.trim() && (
              <p className="px-4 py-3 text-sm text-foreground-muted">Nenhum resultado para &quot;{search}&quot;.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
