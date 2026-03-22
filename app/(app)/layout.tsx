import { auth } from "@clerk/nextjs/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthProvider } from "@/lib/mc/auth-provider";
import { resolveTenantId, ensureTenant } from "@/lib/mc/tenant";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.protect();

  // Ensure tenant exists (best-effort, don't block rendering)
  try {
    const { tenantId, userId } = await resolveTenantId();
    await ensureTenant(tenantId, userId, session.orgId);
  } catch (err) {
    console.error("[Layout] Tenant setup failed:", err instanceof Error ? err.message : err);
  }

  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
