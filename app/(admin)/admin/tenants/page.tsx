import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { AdminShell } from "@/components/admin/admin-shell";

async function getTenants() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export default async function AdminTenantsPage() {
  const tenants = await getTenants();

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tenants</h1>
          <span className="text-sm text-foreground-muted">{tenants.length} total</span>
        </div>

        <div className="rounded-lg border border-line bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-strong">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-line/50 hover:bg-surface-strong/50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-foreground-soft">{t.id.slice(0, 16)}...</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      t.type === "org" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{t.name || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent border border-accent/20">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.suspended ? (
                      <span className="text-red-400 text-xs font-medium">Suspended</span>
                    ) : (
                      <span className="text-emerald-400 text-xs font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="text-xs font-medium text-accent hover:text-accent/80 transition"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground-muted">
                    No tenants yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
