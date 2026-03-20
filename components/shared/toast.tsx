"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 4000;

const typeStyles: Record<ToastType, string> = {
  success: "border-accent/30 bg-accent-soft text-accent",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-line-strong bg-surface-strong text-foreground-soft",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION);
  }, []);

  // Register global toast for MC modules that call toast() outside React
  useEffect(() => {
    _registerGlobalToast(add);
    return () => { _globalAdd = null; };
  }, [add]);

  const ctx: ToastContextValue = {
    success: (m) => add("success", m),
    error: (m) => add("error", m),
    info: (m) => add("info", m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${typeStyles[t.type]}`}
              style={{ minWidth: 240, maxWidth: 400 }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// Global toast function — works outside React components (used by MC modules)
let _globalAdd: ((type: ToastType, message: string) => void) | null = null;

export function _registerGlobalToast(add: (type: ToastType, message: string) => void) {
  _globalAdd = add;
}

export function toast(type: ToastType, message: string) {
  if (_globalAdd) {
    _globalAdd(type, message);
  } else {
    console.warn("[toast] ToastProvider not mounted yet:", type, message);
  }
}
