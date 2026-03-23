export type { ProjectStorageAdapter } from "./adapter";
export { LocalStorageAdapter } from "./local-storage";
export { SupabaseAdapter } from "./supabase-adapter";
export type { UserSettingsAdapter } from "./settings-adapter";
export { SupabaseSettingsAdapter, LocalSettingsAdapter, getSettingsAdapter, setSettingsAdapter } from "./settings-adapter";

import { SupabaseAdapter } from "./supabase-adapter";
import type { ProjectStorageAdapter } from "./adapter";

let _adapter: ProjectStorageAdapter | null = null;

export function getStorageAdapter(): ProjectStorageAdapter {
  if (!_adapter) {
    // Default to Supabase — all authenticated users use Supabase.
    // AuthProvider may override this, but Supabase is the correct default
    // to avoid race conditions where operations happen before AuthProvider mounts.
    _adapter = new SupabaseAdapter();
  }
  return _adapter;
}

export function setStorageAdapter(adapter: ProjectStorageAdapter) {
  _adapter = adapter;
}
