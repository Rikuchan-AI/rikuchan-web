type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="mono text-xs uppercase tracking-[0.18em] text-foreground-muted">{label}</p>
      <p className="metric-number mt-4 text-[2rem] font-semibold text-accent">{value}</p>
      <p className="mt-2 text-sm text-foreground-soft">{helper}</p>
    </div>
  );
}
