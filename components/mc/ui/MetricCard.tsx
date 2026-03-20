"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  valueColor?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  helper,
  valueColor = "var(--accent)",
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface p-5 glow-card ${className}`}
    >
      <p
        className="mono text-xs uppercase text-foreground-muted"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
      </p>
      <p
        className="metric-number mt-4 text-[2rem] font-semibold leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-sm text-foreground-soft">{helper}</p>
      )}
    </div>
  );
}
