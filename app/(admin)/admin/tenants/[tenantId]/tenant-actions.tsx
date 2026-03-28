"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Combobox } from "@/components/mc/ui/Combobox";
import { toast } from "@/components/shared/toast";

interface TenantActionsProps {
  tenantId: string;
  suspended: boolean;
  plan: string;
}

export function TenantActions({ tenantId, suspended, plan }: TenantActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleAction(action: string, body: Record<string, unknown> = {}) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Action failed: ${res.status}`);
      router.refresh();
    } catch {
      toast("error", `Failed to ${action} tenant`);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/export`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${tenantId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("error", "Failed to export tenant data");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: tenantId }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error("Delete failed");
      setShowDeleteConfirm(false);
      router.push("/admin/tenants");
    } catch {
      toast("error", "Failed to delete tenant");
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

      <button
        onClick={handleExport}
        disabled={loading}
        className="rounded-md px-3 py-1.5 text-sm font-medium border border-line bg-surface-strong text-foreground-muted hover:text-foreground transition"
      >
        Export
      </button>

      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading}
          className="rounded-md px-3 py-1.5 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition"
        >
          Delete
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition"
          >
            Confirm Delete
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="rounded-md px-2 py-1.5 text-sm text-foreground-muted hover:text-foreground transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
