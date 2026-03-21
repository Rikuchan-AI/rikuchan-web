export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-line bg-surface p-5 animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-surface-strong skeleton-shimmer" />
      <div className="h-3 w-1/2 rounded bg-surface-strong skeleton-shimmer" />
      <div className="h-3 w-full rounded bg-surface-strong skeleton-shimmer" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 animate-pulse py-3">
      <div className="h-8 w-8 rounded-full bg-surface-strong skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-surface-strong skeleton-shimmer" />
        <div className="h-2 w-1/2 rounded bg-surface-strong skeleton-shimmer" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
