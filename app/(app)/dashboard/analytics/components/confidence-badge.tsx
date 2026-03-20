"use client";

import { useState } from "react";
import { type Locale, t } from "@/lib/i18n";

type Level = "measured" | "calculated" | "estimated";

const BADGE_CONFIG: Record<Level, { label_key: string; color: string; dot: string }> = {
  measured: {
    label_key: "confidence.measured",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  calculated: {
    label_key: "confidence.calculated",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  estimated: {
    label_key: "confidence.estimated",
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dot: "bg-orange-400",
  },
};

export function ConfidenceBadge({
  level,
  tooltip,
  locale = "pt-BR",
}: {
  level: Level;
  tooltip?: string;
  locale?: Locale;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = BADGE_CONFIG[level];
  const label = t(locale, config.label_key);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${config.color}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {level === "measured" ? "Medido" : level === "calculated" ? "Calculado" : "Estimado"}
      </button>
      {showTooltip && tooltip && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface p-3 text-xs text-foreground-soft shadow-lg">
          {tooltip}
        </span>
      )}
    </span>
  );
}
