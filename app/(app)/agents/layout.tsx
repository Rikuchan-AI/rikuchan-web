"use client";

import { redirect } from "next/navigation";
import { GatewayProvider } from "@/components/mc/providers/GatewayProvider";
import { AuthProvider } from "@/lib/mc/auth-provider";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  if (!MC_ENABLED) {
    redirect("/dashboard");
  }

  return (
    <AuthProvider>
      <GatewayProvider>{children}</GatewayProvider>
    </AuthProvider>
  );
}
