"use client";

import { Info } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export function InfoTooltip({ text, side = "top" }: { text: string; side?: "top" | "right" }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (side === "right") {
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
    } else {
      setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    }
  }, [side]);

  const hide = useCallback(() => setPos(null), []);

  const tooltipStyle: React.CSSProperties =
    side === "right"
      ? { top: pos?.top ?? 0, left: pos?.left ?? 0, transform: "translateY(-50%)" }
      : { top: pos?.top ?? 0, left: pos?.left ?? 0, transform: "translate(-50%, -100%)" };

  return (
    <>
      <span
        ref={ref}
        className="inline-flex items-center cursor-help"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <Info size={12} className="text-foreground-muted/50 hover:text-foreground-muted transition-colors" />
      </span>

      {pos && typeof document !== "undefined" && createPortal(
        <span
          style={{ ...tooltipStyle, position: "fixed", zIndex: 9999, marginTop: side === "top" ? "-4px" : 0 }}
          className="pointer-events-none w-56 rounded-lg border border-line bg-surface px-2.5 py-2 text-[11px] leading-relaxed text-foreground-soft shadow-lg"
        >
          {text}
        </span>,
        document.body
      )}
    </>
  );
}
