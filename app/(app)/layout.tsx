"use client";

import { useEffect } from "react";
import { AuthProvider, useAuthContext } from "@/lib/mc/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

function TenantSetup() {
  const { ready, userId } = useAuthContext();
  useEffect(() => {
    if (!ready || !userId) return;
    // Fire-and-forget tenant provisioning (GET auto-provisions)
    fetch("/api/mc/tenant").catch(() => {});
  }, [ready, userId]);
  return null;
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <TenantSetup />
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
