"use client";

import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import { GatewayProvider } from "@/components/mc/providers/GatewayProvider";
import { AuthProvider } from "@/lib/mc/auth-provider";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Chat is always available; other MC routes require MC_ENABLED
  if (!MC_ENABLED && !pathname.startsWith("/agents/chat")) {
    redirect("/dashboard");
  }

  return (
    <AuthProvider>
      <GatewayProvider>{children}</GatewayProvider>
    </AuthProvider>
  );
}
