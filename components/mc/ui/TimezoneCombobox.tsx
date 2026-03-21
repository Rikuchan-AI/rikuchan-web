"use client";

import { useMemo } from "react";
import { Combobox } from "./Combobox";

// Extra non-IANA options specific to OpenClaw
const EXTRA_OPTIONS = [
  { id: "utc",   label: "UTC" },
  { id: "local", label: "local — server local time" },
  { id: "user",  label: "user — follow user timezone" },
];

function getTimezoneOptions() {
  try {
    const zones = Intl.supportedValuesOf("timeZone") as string[];
    return zones.map((tz) => {
      const offset = new Intl.DateTimeFormat("en", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";
      return { id: tz, label: tz.replace(/_/g, " "), sub: offset };
    });
  } catch {
    return [];
  }
}

export function TimezoneCombobox({
  value,
  onChange,
  placeholder = "Search timezone...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const options = useMemo(
    () => [...EXTRA_OPTIONS, ...getTimezoneOptions()],
    []
  );

  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
    />
  );
}
