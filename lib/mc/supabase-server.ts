import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using service_role_key.
 * NEVER import this in client components.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key);
}
