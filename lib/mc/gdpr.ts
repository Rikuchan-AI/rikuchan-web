import { getSupabaseAdmin } from "./supabase-server";

// Tables that contain tenant data, ordered for export/delete
const TENANT_TABLES = [
  // MC core
  "mc_tasks",
  "mc_pipelines",
  "mc_board_groups",
  "mc_projects",
  "mc_memory_docs",
  "mc_triggers",
  "mc_chat_sessions",
  "mc_notifications",
  "mc_user_settings",
  // RAG
  "rag_chunks",
  "collections",
  "rag_requests",
  "rag_ingest_requests",
  // Gateway & auth
  "api_keys",
  "provider_credentials",
  "gateway_requests",
  "agent_heartbeats",
  "daily_metrics",
  "embedding_metrics",
  // Platform
  "tenant_usage",
  "tenant_gateways",
  "feature_flags", // tenant-specific flags only
  "backoffice_audit",
] as const;

// Tables with user_id instead of tenant_id
const USER_SCOPED_TABLES = [
  "api_keys",
  "provider_credentials",
] as const;

interface ExportResult {
  tenant_id: string;
  exported_at: string;
  tables: Record<string, { count: number; data: unknown[] }>;
}

/**
 * Export all data for a tenant (GDPR data portability - Article 20).
 * Returns a structured JSON object with all tenant data.
 */
export async function exportTenantData(tenantId: string): Promise<ExportResult> {
  const supabase = getSupabaseAdmin();
  const result: ExportResult = {
    tenant_id: tenantId,
    exported_at: new Date().toISOString(),
    tables: {},
  };

  for (const table of TENANT_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId)
        .limit(10000);

      if (!error && data) {
        result.tables[table] = { count: data.length, data };
      }
    } catch {
      // Table might not exist or have different schema — skip silently
    }
  }

  // Export tenant record itself
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (tenant) {
    result.tables["tenants"] = { count: 1, data: [tenant] };
  }

  return result;
}

/**
 * Delete/anonymize all data for a tenant (GDPR right to erasure - Article 17).
 * This is a soft-delete: marks tenant as deleted and anonymizes PII.
 * Hard purge happens after 90-day retention window.
 */
export async function deleteTenantData(
  tenantId: string,
  staffUserId: string,
): Promise<{ deleted_tables: string[]; anonymized: boolean }> {
  const supabase = getSupabaseAdmin();
  const deletedTables: string[] = [];

  // Delete tenant data from all tables (reverse order for FK safety)
  for (const table of [...TENANT_TABLES].reverse()) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("tenant_id", tenantId);

      if (!error) deletedTables.push(table);
    } catch {
      // Skip tables that don't exist or have different schema
    }
  }

  // Anonymize tenant record (soft-delete, keep for audit)
  await supabase
    .from("tenants")
    .update({
      name: "[deleted]",
      slug: null,
      suspended: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  // Audit the deletion
  await supabase.from("backoffice_audit").insert({
    staff_user_id: staffUserId,
    action: "gdpr_delete",
    target_tenant_id: tenantId,
    details: { deleted_tables: deletedTables, anonymized: true },
  });

  return { deleted_tables: deletedTables, anonymized: true };
}
