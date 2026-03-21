import { Info } from "lucide-react";

export function InfoTooltip({ text, side = "top" }: { text: string; side?: "top" | "right" }) {
  const positionClass =
    side === "right"
      ? "left-full top-1/2 -translate-y-1/2 ml-2"
      : "bottom-full left-1/2 -translate-x-1/2 mb-2";

  return (
    <span className="group relative inline-flex items-center">
      <Info size={12} className="text-foreground-muted/50 cursor-help hover:text-foreground-muted transition-colors" />
      <span
        className={`pointer-events-none absolute ${positionClass} z-50 w-56 rounded-lg border border-line bg-surface px-2.5 py-2 text-[11px] leading-relaxed text-foreground-soft shadow-lg opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        {text}
      </span>
    </span>
  );
}
