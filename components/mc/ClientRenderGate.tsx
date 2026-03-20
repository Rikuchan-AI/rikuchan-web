"use client";

import type { ReactNode } from "react";
import { useHasMounted } from "@/lib/mc/use-has-mounted";

export function ClientRenderGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return fallback ?? <div className="min-h-[calc(100vh-72px)]" suppressHydrationWarning />;
  }

  return <>{children}</>;
}
