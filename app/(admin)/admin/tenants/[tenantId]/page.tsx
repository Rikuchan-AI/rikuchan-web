import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { TenantActions } from "./tenant-actions";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

type Props = { params: Promise<{ tenantId: string }> };

async function getTenantDetail(tenantId: string) {
  const { getToken } = await auth();
  const token = await getToken();
  const res = await fetch(`${API_URL}/api/admin/tenants/${tenantId}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.data;
}

export default async function TenantDetailPage({ params }: Props) {
  const { tenantId } = await params;
  const tenant = await getTenantDetail(tenantId);
  if (!tenant) notFound();

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {tenant.name || tenant.id}
            </h1>
            <p className="mt-1 text-sm text-foreground-muted font-mono">{tenant.id}</p>
          </div>
          <TenantActions tenantId={tenant.id} suspended={tenant.suspended} plan={tenant.plan} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Type" value={tenant.type} />
          <InfoCard label="Plan" value={tenant.plan} />
          <InfoCard label="Projects" value={String(tenant.projectCount)} />
          <InfoCard label="Tasks" value={String(tenant.taskCount)} />
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">Details</h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-foreground-muted">Owner User ID</dt>
              <dd className="font-mono text-foreground-soft">{tenant.owner_user_id}</dd>
            </div>
            <div>
              <dt className="text-foreground-muted">Clerk Org ID</dt>
              <dd className="font-mono text-foreground-soft">{tenant.clerk_org_id || "-"}</dd>
            </div>
            <div>
              <dt className="text-foreground-muted">Slug</dt>
              <dd className="text-foreground-soft">{tenant.slug || "-"}</dd>
            </div>
            <div>
              <dt className="text-foreground-muted">Status</dt>
              <dd className={tenant.suspended ? "text-red-400" : "text-emerald-400"}>
                {tenant.suspended ? "Suspended" : "Active"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-muted">Created</dt>
              <dd className="text-foreground-soft">{new Date(tenant.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-foreground-muted">Updated</dt>
              <dd className="text-foreground-soft">{new Date(tenant.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        {tenant.planDetails && (
          <div className="rounded-lg border border-line bg-surface p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">Plan Limits</h2>
            <dl className="grid gap-2 sm:grid-cols-3 text-sm">
              {Object.entries(tenant.planDetails.limits as Record<string, unknown>).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-foreground-muted">{key.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-foreground">{value === 0 ? "Unlimited" : String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground capitalize">{value}</p>
    </div>
  );
}
