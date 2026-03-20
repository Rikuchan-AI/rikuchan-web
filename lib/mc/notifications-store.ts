"use client";
import { create } from "zustand";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  projectId?: string;
  taskId?: string;
  agentId?: string;
}

interface NotificationsStore {
  notifications: Notification[];
  unreadCount: number;
  push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  _hydrate: () => void;
  _persist: () => void;
}

const STORAGE_KEY = "rikuchan:notifications";
const MAX_NOTIFICATIONS = 100;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.read).length;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  push: (n) => {
    const notification: Notification = {
      ...n,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    };
    set((state) => {
      const updated = [notification, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      );
      return {
        notifications: updated,
        unreadCount: deriveUnreadCount(updated),
      };
    });
    get()._persist();
  },

  markRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: deriveUnreadCount(updated),
      };
    });
    get()._persist();
  },

  markAllRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      return {
        notifications: updated,
        unreadCount: 0,
      };
    });
    get()._persist();
  },

  clear: () => {
    set({ notifications: [], unreadCount: 0 });
    get()._persist();
  },

  _hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const notifications: Notification[] = JSON.parse(raw);
        set({
          notifications,
          unreadCount: deriveUnreadCount(notifications),
        });
      }
    } catch {
      // Corrupted data — start fresh
    }
  },

  _persist: () => {
    try {
      const { notifications } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // localStorage full or unavailable
    }
  },
}));
