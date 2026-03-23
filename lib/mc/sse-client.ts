"use client";

import {
  fetchEventSource,
  EventStreamContentType,
} from "@microsoft/fetch-event-source";

// ─── SSE Event Types ─────────────────────────────────────────────────────────

export type SseEventMap = {
  "gateway:status": {
    status: string;
    activeProjects?: number;
    [k: string]: unknown;
  };
  "gateway:error": { error: string };
  "agent:status": {
    projectId: string;
    agentId: string;
    status: string;
    [k: string]: unknown;
  };
  "agent:heartbeat": { projectId: string; [k: string]: unknown };
  "agent:spawned": {
    projectId: string;
    agentId: string;
    taskId?: string;
    [k: string]: unknown;
  };
  "agent:ended": {
    projectId: string;
    agentId: string;
    [k: string]: unknown;
  };
  "task:updated": {
    projectId: string;
    taskId: string;
    status?: string;
    [k: string]: unknown;
  };
  "task:blocked": {
    projectId: string;
    taskId: string;
    reason: string;
    [k: string]: unknown;
  };
  "execution:log": {
    taskId: string;
    role: string;
    content: string;
    [k: string]: unknown;
  };
  "delegation:status": {
    projectId: string;
    taskId: string;
    status: string;
    [k: string]: unknown;
  };
  "lead:standup": { projectId: string; report: string; [k: string]: unknown };
  notification: {
    type: string;
    title: string;
    body?: string;
    [k: string]: unknown;
  };
  "health:tick": Record<string, unknown>;
  ping: Record<string, unknown>;
};

export type SseEventType = keyof SseEventMap;
type SseHandler<T extends SseEventType> = (data: SseEventMap[T]) => void;

// ─── Client ──────────────────────────────────────────────────────────────────

export class SseClient {
  private ctrl: AbortController | null = null;
  private handlers = new Map<string, Set<Function>>();
  private _connected = false;
  private _onReconnect?: () => Promise<void>;

  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string | null>,
  ) {}

  get connected() {
    return this._connected;
  }

  on<T extends SseEventType>(event: T, handler: SseHandler<T>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  onReconnect(cb: () => Promise<void>) {
    this._onReconnect = cb;
  }

  async connect() {
    this.disconnect();
    this.ctrl = new AbortController();

    const self = this;

    await fetchEventSource(`${this.baseUrl}/api/events`, {
      method: "GET",
      headers: { Authorization: `Bearer ${await this.getToken()}` },
      signal: this.ctrl.signal,

      async onopen(response) {
        if (
          response.ok &&
          response.headers
            .get("content-type")
            ?.includes(EventStreamContentType)
        ) {
          // Reconnect: re-hydrate state
          if (self._onReconnect) {
            await self._onReconnect();
          }
          return;
        }
        throw new Error(`SSE open failed: ${response.status}`);
      },

      onmessage(event) {
        if (!self._connected) {
          self._connected = true;
        }
        if (event.event === "ping" || !event.event) return;

        try {
          const data = JSON.parse(event.data);
          const handlers = self.handlers.get(event.event);
          if (handlers) {
            for (const handler of handlers) handler(data);
          }
        } catch (e) {
          console.error("[sse] Parse error:", event, e);
        }
      },

      onerror(err) {
        self._connected = false;
        console.error("[sse] Error, will retry:", err);
        // fetchEventSource handles retry with backoff automatically
      },

      onclose() {
        self._connected = false;
      },

      // Keep connection alive even with hidden tab
      openWhenHidden: true,
    });
  }

  disconnect() {
    if (this.ctrl) {
      this.ctrl.abort();
      this.ctrl = null;
    }
    this._connected = false;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _sse: SseClient | null = null;

export function initSseClient(
  baseUrl: string,
  getToken: () => Promise<string | null>,
) {
  _sse = new SseClient(baseUrl, getToken);
}

export function getSseClient(): SseClient {
  if (!_sse) throw new Error("SseClient not initialized");
  return _sse;
}
