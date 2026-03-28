import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthProvider } from "@/lib/mc/auth-provider";
import { GatewayProvider } from "@/components/mc/providers/GatewayProvider";
import { resolveTenantId, ensureTenant, checkTenantOnboarding } from "@/lib/mc/tenant";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth is enforced by the proxy — use auth() to read session data
  const session = await auth();
  if (!session.userId) {
    redirect("/login");
  }

  // Ensure tenant exists and check onboarding
  try {
    const { tenantId, userId } = await resolveTenantId();
    await ensureTenant(tenantId, userId, session.orgId ?? undefined);

    const onboardingCompleted = await checkTenantOnboarding(tenantId);
    if (!onboardingCompleted) {
      redirect("/onboarding");
    }
  } catch (err) {
    // redirect() throws a special Next.js error — rethrow it
    if (err && typeof err === "object" && "digest" in err) throw err;
    // Other errors — continue rendering
    console.error("[Layout] Tenant setup failed:", err instanceof Error ? err.message : err);
  }

  return (
    <AuthProvider>
      <GatewayProvider>
        <DashboardShell>{children}</DashboardShell>
      </GatewayProvider>
    </AuthProvider>
  );
}
