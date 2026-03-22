"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface TenantActionsProps {
  tenantId: string;
  suspended: boolean;
  plan: string;
}

export function TenantActions({ tenantId, suspended, plan }: TenantActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: string, body: Record<string, unknown> = {}) {
    setLoading(true);
    try {
      await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm text-foreground"
        value={plan}
        onChange={(e) => handleAction("change_plan", { plan: e.target.value })}
        disabled={loading}
      >
        <option value="free">Free</option>
        <option value="starter">Starter</option>
        <option value="team">Team</option>
        <option value="enterprise">Enterprise</option>
      </select>

      <button
        onClick={() => handleAction(suspended ? "unsuspend" : "suspend")}
        disabled={loading}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          suspended
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
        }`}
      >
        {suspended ? "Unsuspend" : "Suspend"}
      </button>
    </div>
  );
}
