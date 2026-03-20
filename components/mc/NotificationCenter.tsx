"use client";

import { useState } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/mc/mc-utils";

// Inline store to avoid circular deps — will be connected via props
export interface NotificationItem {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  projectId?: string;
  taskId?: string;
}

interface NotificationCenterProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClear: () => void;
  onClickNotification?: (n: NotificationItem) => void;
}

const typeColors: Record<string, { dot: string; bg: string }> = {
  success: { dot: "bg-accent", bg: "" },
  error:   { dot: "bg-danger", bg: "bg-danger-soft/30" },
  warning: { dot: "bg-warm", bg: "bg-warm-soft/30" },
  info:    { dot: "bg-foreground-muted", bg: "" },
};

export function NotificationCenter({ notifications, unreadCount, onMarkRead, onMarkAllRead, onClear, onClickNotification }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-[360px] rounded-lg border border-line bg-surface shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-sm font-medium text-foreground">Notifications</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
                  >
                    <Check size={10} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => { onClear(); setOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-foreground-muted hover:text-danger hover:bg-danger-soft transition-colors"
                >
                  <Trash2 size={10} /> Clear
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-foreground-muted text-center py-8">No notifications</p>
              ) : (
                notifications.slice(0, 30).map((n) => {
                  const colors = typeColors[n.type] ?? typeColors.info;
                  return (
                    <div
                      key={n.id}
                      onClick={() => { onMarkRead(n.id); onClickNotification?.(n); }}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-line/50 cursor-pointer hover:bg-surface-strong/50 transition-colors ${
                        !n.read ? colors.bg : ""
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${colors.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${!n.read ? "text-foreground" : "text-foreground-soft"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="mono text-[10px] text-foreground-muted/60 mt-1">{formatRelativeTime(n.timestamp)}</p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
