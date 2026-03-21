"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

export interface ComboboxOption {
  id: string;
  label: string;
  sub?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  mono?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? options.filter(
        (o) =>
          o.id.toLowerCase().includes(value.toLowerCase()) ||
          o.label.toLowerCase().includes(value.toLowerCase())
      )
    : options;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-md border border-line bg-surface-strong px-3 py-2 pr-16 text-sm text-foreground focus:outline-none focus:border-accent/50 ${mono ? "font-mono" : ""}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(true); }}
            className="absolute right-9 flex items-center justify-center w-5 h-5 rounded text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 flex items-center justify-center w-6 h-6 rounded text-white/40 hover:text-white transition-colors"
        >
          <ChevronDown
            size={14}
            strokeWidth={2.5}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-line bg-surface shadow-xl max-h-52 overflow-y-auto py-1">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-surface-strong ${
                value === o.id ? "text-accent font-medium" : "text-foreground-soft"
              }`}
            >
              <span className={mono ? "font-mono" : ""}>{o.label}</span>
              {o.sub && (
                <span className="ml-2 text-[11px] text-foreground-muted">{o.sub}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
