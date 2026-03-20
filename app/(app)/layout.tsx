import { auth } from "@clerk/nextjs/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await auth.protect();
  return <DashboardShell>{children}</DashboardShell>;
}
