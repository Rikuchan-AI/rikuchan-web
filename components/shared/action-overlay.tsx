"use client";

import { useState } from "react";
import { RikuLoader } from "./riku-loader";

interface ActionOverlayProps {
  /** Icon shown at the top (e.g. <Trash2 />) */
  icon: React.ReactNode;
  /** Main title — supports JSX for colored spans */
  title: React.ReactNode;
  /** Subtitle / description */
  description?: string;
  /** Label for confirm button */
  confirmLabel?: string;
  /** Label shown while executing */
  loadingLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Async action to execute on confirm */
  onConfirm: () => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Accent color for icon and confirm button — defaults to "danger" */
  variant?: "danger" | "warning" | "accent";
}

const variantStyles = {
  danger: {
    border: "border-danger/30",
    icon: "text-danger",
    btn: "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20",
  },
  warning: {
    border: "border-warning/30",
    icon: "text-warning",
    btn: "bg-warning/10 border-warning/30 text-warning hover:bg-warning/20",
  },
  accent: {
    border: "border-accent/30",
    icon: "text-accent",
    btn: "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20",
  },
};

export function ActionOverlay({
  icon,
  title,
  description,
  confirmLabel = "Confirmar",
  loadingLabel = "Processando...",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  variant = "danger",
}: ActionOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setLoading(false);
    }
  };

  return (
    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-surface/95 backdrop-blur-sm border ${styles.border} p-4 gap-3`}>
      {loading ? (
        <RikuLoader size="sm" message={loadingLabel} />
      ) : (
        <>
          <div className={styles.icon}>{icon}</div>
          <p className="text-sm font-medium text-foreground text-center">{title}</p>
          {description && (
            <p className="text-[11px] text-foreground-muted text-center">{description}</p>
          )}
          {error && (
            <p className="text-[11px] text-danger text-center">{error}</p>
          )}
          <div className="flex gap-2 w-full max-w-[240px]">
            <button
              onClick={() => { setError(null); onCancel(); }}
              className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${styles.btn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
