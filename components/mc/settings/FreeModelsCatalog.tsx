"use client";

import { useMemo } from "react";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import type { ModelGroup } from "@/lib/mc/types";
import type { FreeModelEntry, FreeModelsResponse } from "@/lib/mc/free-models";

function groupFreeModels(models: FreeModelEntry[]) {
  const groups = new Map<string, FreeModelEntry[]>();
  for (const model of models) {
    const provider = model.provider;
    if (!groups.has(provider)) groups.set(provider, []);
    groups.get(provider)!.push(model);
  }
  return Array.from(groups.entries());
}

function countGatewayFreeModels(gatewayModels: ModelGroup[], freeModelIds: Set<string>) {
  return gatewayModels.flatMap((group) => group.models).filter((model) => freeModelIds.has(model.id)).length;
}

export function FreeModelsCatalog({
  data,
  loading,
}: {
  data: FreeModelsResponse | null;
  loading: boolean;
}) {
  const gatewayModels = useGatewayStore((s) => s.availableModels);

  const freeModels = data?.freeModels ?? [];
  const grouped = useMemo(() => groupFreeModels(freeModels), [freeModels]);
  const freeModelIds = useMemo(() => new Set(freeModels.map((model) => model.id)), [freeModels]);
  const gatewayVisibleCount = useMemo(
    () => countGatewayFreeModels(gatewayModels, freeModelIds),
    [gatewayModels, freeModelIds]
  );

  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.03em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Free Models Radar
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Modelos com custo 0 configurados no OpenClaw e quantos o gateway está expondo agora.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-surface-strong text-foreground-soft border border-line-strong">
            {freeModels.length} configured free
          </span>
          <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-accent-soft text-accent border border-accent/15">
            {gatewayVisibleCount} in gateway
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <p className="text-sm text-foreground-muted">Carregando catálogo de modelos free…</p>
        ) : data?.error ? (
          <p className="text-sm text-danger">{data.error}</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-foreground-muted">Nenhum modelo free encontrado no `openclaw.json`.</p>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
            {grouped.map(([provider, models], index) => (
              <div key={provider}>
                {index > 0 && <div className="border-t border-line" />}
                <div className="px-4 py-2 bg-surface-muted flex items-center justify-between">
                  <span className="mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>
                    {provider}
                  </span>
                  <span className="mono text-[0.65rem] text-foreground-muted">{models.length}</span>
                </div>
                {models.map((model) => {
                  const visibleInGateway = gatewayModels.some((group) => group.models.some((item) => item.id === model.id));
                  return (
                    <div key={`${provider}-${model.id}`} className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line/50">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{model.name}</p>
                        <p className="text-xs text-foreground-muted truncate">
                          {model.id}
                          {model.contextWindow ? ` · ${model.contextWindow.toLocaleString("en-US")} ctx` : ""}
                          {model.maxTokens ? ` · ${model.maxTokens.toLocaleString("en-US")} max out` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {model.allowlisted && (
                          <span className="rounded-md px-2 py-0.5 text-[0.65rem] font-semibold bg-success-soft text-success border border-success/15">
                            allowlisted
                          </span>
                        )}
                        <span className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold border ${
                          visibleInGateway
                            ? "bg-accent-soft text-accent border-accent/15"
                            : "bg-surface-strong text-foreground-muted border-line-strong"
                        }`}>
                          {visibleInGateway ? "gateway" : "hidden"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {data?.configPath && (
          <p className="text-xs text-foreground-muted">
            Fonte: {data.configPath}
          </p>
        )}
      </div>
    </div>
  );
}
