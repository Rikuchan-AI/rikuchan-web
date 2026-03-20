export type { ProjectStorageAdapter } from "./adapter";
export { LocalStorageAdapter } from "./local-storage";
export { SupabaseAdapter } from "./supabase-adapter";
export type { UserSettingsAdapter } from "./settings-adapter";
export { SupabaseSettingsAdapter, LocalSettingsAdapter, getSettingsAdapter, setSettingsAdapter } from "./settings-adapter";

import { LocalStorageAdapter } from "./local-storage";
import type { ProjectStorageAdapter } from "./adapter";

let _adapter: ProjectStorageAdapter | null = null;

export function getStorageAdapter(): ProjectStorageAdapter {
  if (!_adapter) {
    _adapter = new LocalStorageAdapter();
  }
  return _adapter;
}

export function setStorageAdapter(adapter: ProjectStorageAdapter) {
  _adapter = adapter;
}
