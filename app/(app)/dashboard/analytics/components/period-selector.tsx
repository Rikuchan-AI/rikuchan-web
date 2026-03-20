"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIODS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
] as const;

export function PeriodSelector({ current = "30d" }: { current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`/dashboard/analytics?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-muted p-1">
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            current === value
              ? "bg-accent text-zinc-950"
              : "text-foreground-soft hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
