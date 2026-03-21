"use client";

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditActorType = "human" | "agent" | "system";
export type AuditResourceType =
  | "project"
  | "group"
  | "agent"
  | "task"
  | "pipeline"
  | "spawn"
  | "config"
  | "budget";

export interface AuditEvent {
  id: string;
  timestamp: number;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  resourceType: AuditResourceType;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, unknown>;
}

const STORAGE_KEY = "rikuchan_audit_log";
const MAX_EVENTS = 2000;

// ─── Store ─────────────────────────────────────────────────────────────────

interface AuditStore {
  events: AuditEvent[];
  _hydrated: boolean;
  hydrate: () => void;
  log: (event: Omit<AuditEvent, "id" | "timestamp">) => void;
  clear: () => void;
  export: () => string;
}

function loadFromStorage(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(events: AuditEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch { /* ignore quota errors */ }
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  events: [],
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return;
    const events = loadFromStorage();
    set({ events, _hydrated: true });
  },

  log: (event) => {
    const full: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    set((s) => {
      const events = [full, ...s.events].slice(0, MAX_EVENTS);
      saveToStorage(events);
      return { events };
    });
  },

  clear: () => {
    set({ events: [] });
    saveToStorage([]);
  },

  export: () => {
    return JSON.stringify(get().events, null, 2);
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function auditLog(event: Omit<AuditEvent, "id" | "timestamp">) {
  useAuditStore.getState().log(event);
}
