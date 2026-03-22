import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthProvider } from "@/lib/mc/auth-provider";
import { resolveTenantId, ensureTenant, checkTenantOnboarding } from "@/lib/mc/tenant";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.protect();

  // Ensure tenant exists and check onboarding
  const { tenantId, userId } = await resolveTenantId();
  await ensureTenant(tenantId, userId, session.orgId);

  const onboardingCompleted = await checkTenantOnboarding(tenantId);
  if (!onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
