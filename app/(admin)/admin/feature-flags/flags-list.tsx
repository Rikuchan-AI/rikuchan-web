"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/shared/toast";

interface Flag {
  key: string;
  description: string | null;
  enabled_globally: boolean;
  enabled_plans: string[];
  enabled_tenants: string[];
}

export function FlagsList({ initialFlags }: { initialFlags: Flag[] }) {
  const router = useRouter();
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleGlobal(key: string, enabled: boolean) {
    setLoading(key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled_globally: enabled }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error("Failed to toggle flag");
      router.refresh();
    } catch {
      toast("error", "Failed to toggle feature flag");
    } finally {
      setLoading(null);
    }
  }

  async function createFlag() {
    if (!newKey.trim()) return;
    setLoading("create");
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), description: newDesc.trim() || null }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error("Failed to create flag");
      setNewKey("");
      setNewDesc("");
      router.refresh();
    } catch {
      toast("error", "Failed to create feature flag");
    } finally {
      setLoading(null);
    }
  }

  async function deleteFlag(key: string) {
    if (!confirm(`Delete feature flag "${key}"? This cannot be undone.`)) return;
    setLoading(key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error("Failed to delete flag");
      router.refresh();
    } catch {
      toast("error", "Failed to delete feature flag");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="flag_key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted flex-1"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="rounded-md border border-line bg-surface-strong px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted flex-1"
        />
        <button
          onClick={createFlag}
          disabled={loading === "create" || !newKey.trim()}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
        >
          {loading === "create" ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-strong">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Global</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Plans</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {initialFlags.map((flag) => (
              <tr key={flag.key} className="border-b border-line/50">
                <td className="px-4 py-3 font-mono text-foreground">{flag.key}</td>
                <td className="px-4 py-3 text-foreground-soft">{flag.description || "-"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleGlobal(flag.key, !flag.enabled_globally)}
                    disabled={loading === flag.key}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase transition disabled:opacity-50 ${
                      flag.enabled_globally
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                    }`}
                  >
                    {loading === flag.key ? "..." : flag.enabled_globally ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-foreground-muted">
                  {flag.enabled_plans.length > 0 ? flag.enabled_plans.join(", ") : "-"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteFlag(flag.key)}
                    disabled={loading === flag.key}
                    className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  >
                    {loading === flag.key ? "..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {initialFlags.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-foreground-muted">
                  No feature flags configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
