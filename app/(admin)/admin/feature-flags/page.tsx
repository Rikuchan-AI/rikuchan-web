import { getSupabaseAdmin } from "@/lib/mc/supabase-server";
import { AdminShell } from "@/components/admin/admin-shell";
import { FlagsList } from "./flags-list";

async function getFlags() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("feature_flags")
    .select("key,description,enabled_globally,enabled_plans,enabled_tenants")
    .order("key");
  return data || [];
}

export default async function AdminFeatureFlagsPage() {
  const flags = await getFlags();

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Feature Flags</h1>
        </div>
        <FlagsList initialFlags={flags} />
      </div>
    </AdminShell>
  );
}
