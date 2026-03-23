import { auth } from "@clerk/nextjs/server";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/lib/mc/auth-provider";
import { resolveTenantId, ensureTenant } from "@/lib/mc/tenant";

// Render DashboardShell only on client to avoid hydration mismatch
// caused by Clerk components (OrganizationSwitcher, UserButton)
const DashboardShell = dynamic(
  () => import("@/components/dashboard/dashboard-shell").then((m) => m.DashboardShell),
  { ssr: false },
);

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
