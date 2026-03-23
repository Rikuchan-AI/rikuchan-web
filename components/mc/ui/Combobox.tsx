"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

export interface ComboboxOption {
  id: string;
  label: string;
  sub?: string;
  group?: string;
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
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value),
    [options, value]
  );

  const displayValue = isSearching ? search : (selectedOption?.label ?? value);

  const query = isSearching ? search.toLowerCase().trim() : "";
  const filtered = query
    ? options.filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          o.label.toLowerCase().includes(query)
      )
    : options;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIsSearching(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const handleOpen = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
    setOpen(true);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setIsSearching(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
    setIsSearching(false);
    handleOpen();
  };

  // Group support: render with group headers if any option has a group
  const hasGroups = options.some((o) => o.group);

  const renderOptions = () => {
    if (!hasGroups) {
      return filtered.map((o) => (
        <button
          key={o.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(o.id)}
          className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-surface-strong ${
            value === o.id ? "text-accent font-medium" : "text-foreground-soft"
          }`}
        >
          <span className={mono ? "font-mono" : ""}>{o.label}</span>
          {o.sub && (
            <span className="ml-2 text-[11px] text-foreground-muted">{o.sub}</span>
          )}
        </button>
      ));
    }

    // Grouped rendering
    const groups: { group: string; items: ComboboxOption[] }[] = [];
    for (const o of filtered) {
      const g = o.group ?? "";
      const last = groups[groups.length - 1];
      if (last && last.group === g) {
        last.items.push(o);
      } else {
        groups.push({ group: g, items: [o] });
      }
    }
    return groups.map((g) => (
      <div key={g.group}>
        {g.group && (
          <div className="px-3 py-1 text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
            {g.group}
          </div>
        )}
        {g.items.map((o) => (
          <button
            key={o.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect(o.id)}
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
    ));
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => { setSearch(e.target.value); setIsSearching(true); handleOpen(); }}
          onFocus={() => { setSearch(""); setIsSearching(true); handleOpen(); }}
          onBlur={() => { setIsSearching(false); setSearch(""); }}
          placeholder={placeholder}
          className={`w-full rounded-md border border-line bg-surface-strong px-3 py-2 pr-16 text-sm text-foreground focus:outline-none focus:border-accent/50 ${mono ? "font-mono" : ""}`}
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-9 flex items-center justify-center w-5 h-5 rounded text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (open ? setOpen(false) : handleOpen())}
          className="absolute right-2 flex items-center justify-center w-6 h-6 rounded text-white/40 hover:text-white transition-colors"
        >
          <ChevronDown
            size={14}
            strokeWidth={2.5}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && filtered.length > 0 && typeof document !== "undefined" && createPortal(
        <div
          style={dropdownStyle}
          className="rounded-lg border border-line bg-surface shadow-xl max-h-52 overflow-y-auto py-1"
        >
          {renderOptions()}
        </div>,
        document.body
      )}
    </div>
  );
}
