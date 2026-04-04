"use client";

import { useState } from "react";
import { useCorpusQuality, useCorpusActions } from "@/lib/mc/corpus-store";
import { useToast } from "@/components/shared/toast";
import { ConfirmDialog } from "./confirm-dialog";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";

const SEVERITY_ICON = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
} as const;

const SEVERITY_COLORS = {
  warning: "text-amber-400",
  info: "text-blue-400",
  success: "text-emerald-400",
} as const;

export function QualityAlerts({ canManage }: { canManage: boolean }) {
  const { quality } = useCorpusQuality();
  const { reindex, cleanup } = useCorpusActions();
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    label: string;
    description: string;
  } | null>(null);
  const [acting, setActing] = useState(false);

  if (quality.length === 0) return null;

  async function handleAction(alert: (typeof quality)[number]) {
    if (!alert.actionEndpoint) return;

    setActing(true);
    try {
      if (alert.type === "failed_embeddings") {
        const result = await reindex({ scope: "failed" });
        toast.success(`${result.affected} failed chunks queued for re-embed`);
      } else if (alert.type === "micro_chunks") {
        const result = await cleanup({ type: "micro_chunks", dryRun: false });
        toast.success(`${result.affectedCount} micro chunks archived`);
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(false);
      setConfirmAction(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">
          Quality Alerts
        </h2>
        <div className="space-y-3">
          {quality.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            const colorClass = SEVERITY_COLORS[alert.severity];

            return (
              <div
                key={alert.type}
                className="flex items-start gap-3 rounded-lg border border-line/50 bg-surface-strong/30 px-4 py-3"
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{alert.message}</p>
                </div>
                {canManage && alert.actionLabel && alert.actionEndpoint && (
                  <button
                    onClick={() =>
                      setConfirmAction({
                        type: alert.type,
                        label: alert.actionLabel!,
                        description: `This will ${alert.actionLabel!.toLowerCase()} ${alert.count} ${alert.type.replace(/_/g, " ")}. Are you sure?`,
                      })
                    }
                    disabled={acting}
                    className="shrink-0 rounded-md border border-line-strong bg-transparent px-2.5 py-1 text-xs text-foreground-soft hover:bg-surface-strong transition-colors disabled:opacity-50"
                  >
                    {alert.actionLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          open={true}
          title={confirmAction.label}
          description={confirmAction.description}
          confirmLabel={confirmAction.label}
          variant="warning"
          onConfirm={() => {
            const alert = quality.find((a) => a.type === confirmAction.type);
            if (alert) handleAction(alert);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}
