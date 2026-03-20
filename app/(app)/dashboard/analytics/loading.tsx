export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 animate-pulse rounded bg-surface-strong" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-surface-strong" />
      </div>

      {/* Hero skeleton */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="h-3 w-40 animate-pulse rounded bg-surface-strong" />
        <div className="mt-4 h-12 w-48 animate-pulse rounded bg-surface-strong" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border border-line bg-surface-muted p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-surface-strong" />
              <div className="mt-2 h-6 w-24 animate-pulse rounded bg-surface-strong" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="h-3 w-52 animate-pulse rounded bg-surface-strong" />
        <div className="mt-4 h-[280px] animate-pulse rounded bg-surface-strong/30" />
      </div>

      {/* Breakdown skeleton */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="h-3 w-44 animate-pulse rounded bg-surface-strong" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-surface-strong/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
