"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string; // If set, user must type this to confirm
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmText,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!open) setInput("");
  }, [open]);

  const canConfirm = confirmText ? input === confirmText : true;

  const handleConfirm = useCallback(() => {
    if (canConfirm) onConfirm();
  }, [canConfirm, onConfirm]);

  const confirmBtnClass = variant === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : "bg-accent hover:bg-accent-deep text-accent-foreground";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative z-10 w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm text-foreground-soft">{description}</p>

            {confirmText && (
              <div className="mt-4">
                <p className="text-xs text-foreground-muted mb-1">
                  Type <span className="font-mono font-semibold text-foreground">{confirmText}</span> to confirm
                </p>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  autoFocus
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-lg border border-line-strong bg-transparent px-4 py-2 text-sm text-foreground-soft hover:bg-surface-strong transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${confirmBtnClass}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
