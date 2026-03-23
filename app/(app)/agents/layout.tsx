"use client";

import { redirect } from "next/navigation";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  if (!MC_ENABLED) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
