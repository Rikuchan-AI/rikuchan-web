"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Combobox } from "@/components/mc/ui/Combobox";

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
      <Combobox
        value={plan}
        onChange={(v) => { if (!loading) handleAction("change_plan", { plan: v }); }}
        options={[
          { id: "free", label: "Free" },
          { id: "starter", label: "Starter" },
          { id: "team", label: "Team" },
          { id: "enterprise", label: "Enterprise" },
        ]}
        placeholder="Select plan"
      />

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
