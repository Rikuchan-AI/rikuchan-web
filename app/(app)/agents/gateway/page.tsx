"use client";

import { GatewayStatus } from "@/components/mc/gateway/GatewayStatus";
import { GatewayLogs } from "@/components/mc/gateway/GatewayLogs";

export default function GatewayPage() {
  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Gateway
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection config */}
        <div>
          <GatewayStatus />
        </div>

        {/* Logs */}
        <div style={{ height: "calc(100vh - 220px)" }}>
          <GatewayLogs />
        </div>
      </div>
    </div>
  );
}
