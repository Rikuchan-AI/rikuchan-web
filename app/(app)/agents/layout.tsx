"use client";

import { redirect, usePathname } from "next/navigation";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { Wifi } from "lucide-react";
import Link from "next/link";
import { RikuLoader } from "@/components/shared/riku-loader";

const MC_ENABLED = process.env.NEXT_PUBLIC_MC_ENABLED === "true";

/** Pages that work without gateway connection */
const GATEWAY_EXEMPT = ["/agents/gateway", "/agents/settings"];

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const status = useGatewayStore((s) => s.status);
  const hydrated = useGatewayStore((s) => s._configHydrated);

  if (!MC_ENABLED) {
    redirect("/dashboard");
  }

  const isExempt = GATEWAY_EXEMPT.some((p) => pathname.startsWith(p));

  if (!isExempt && hydrated && status !== "connected") {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <RikuLoader size="md" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Gateway offline</h2>
            <p className="text-sm text-foreground-muted">
              Conecte ao gateway para acessar agentes, projetos e sessões.
            </p>
          </div>
          <Link
            href="/agents/gateway"
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors"
          >
            <Wifi size={16} />
            Ir para Gateway
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
