/**
 * Settings persistence adapter for user preferences, chat sessions, and notifications.
 * Mirrors the pattern of ProjectStorageAdapter but for non-project data.
 */

const MC_API = "/api/mc";

export interface UserSettingsAdapter {
  getSetting<T>(key: string, fallback: T): Promise<T>;
  setSetting(key: string, value: unknown): Promise<void>;
  getChatSessions(): Promise<Record<string, unknown>>;
  saveChatSession(sessionKey: string, data: unknown): Promise<void>;
  getNotifications(): Promise<unknown[]>;
  saveNotification(notification: { id: string; timestamp?: number; [key: string]: unknown }): Promise<void>;
}

export class SupabaseSettingsAdapter implements UserSettingsAdapter {
  async getSetting<T>(key: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(`${MC_API}/settings/${key}`);
      if (!res.ok) return fallback;
      const value = await res.json();
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await fetch(`${MC_API}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }

  async getChatSessions(): Promise<Record<string, unknown>> {
    try {
      const res = await fetch(`${MC_API}/chat-sessions`);
      if (!res.ok) return {};
      return res.json();
    } catch {
      return {};
    }
  }

  async saveChatSession(sessionKey: string, data: unknown): Promise<void> {
    await fetch(`${MC_API}/chat-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey, data }),
    });
  }

  async getNotifications(): Promise<unknown[]> {
    try {
      const res = await fetch(`${MC_API}/notifications`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  async saveNotification(notification: { id: string; timestamp?: number }): Promise<void> {
    await fetch(`${MC_API}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notification),
    });
  }
}

export class LocalSettingsAdapter implements UserSettingsAdapter {
  async getSetting<T>(key: string, fallback: T): Promise<T> {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(`rikuchan:settings:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(`rikuchan:settings:${key}`, JSON.stringify(value));
  }

  async getChatSessions(): Promise<Record<string, unknown>> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("rikuchan:chat-sessions");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  async saveChatSession(sessionKey: string, data: unknown): Promise<void> {
    if (typeof window === "undefined") return;
    const sessions = await this.getChatSessions();
    sessions[sessionKey] = data;
    localStorage.setItem("rikuchan:chat-sessions", JSON.stringify(sessions));
  }

  async getNotifications(): Promise<unknown[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("rikuchan:notifications");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveNotification(notification: { id: string }): Promise<void> {
    if (typeof window === "undefined") return;
    const notifications = await this.getNotifications();
    (notifications as { id: string }[]).push(notification);
    localStorage.setItem("rikuchan:notifications", JSON.stringify(notifications));
  }
}

// Singleton
let _settingsAdapter: UserSettingsAdapter | null = null;

export function getSettingsAdapter(): UserSettingsAdapter {
  if (!_settingsAdapter) {
    _settingsAdapter = new LocalSettingsAdapter();
  }
  return _settingsAdapter;
}

export function setSettingsAdapter(adapter: UserSettingsAdapter) {
  _settingsAdapter = adapter;
}
