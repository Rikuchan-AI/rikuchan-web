"use client";

import dynamic from "next/dynamic";

const DashboardShell = dynamic(
  () => import("@/components/dashboard/dashboard-shell").then((m) => m.DashboardShell),
  { ssr: false },
);

export function DashboardShellWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
