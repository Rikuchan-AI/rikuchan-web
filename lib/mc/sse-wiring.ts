"use client";

import { getSseClient } from "./sse-client";
import { useGatewayStore } from "./gateway-store";
import { useProjectsStore } from "./projects-store";
import { useNotificationsStore } from "./notifications-store";
import type { Task } from "./types-project";
import { useChatStore } from "./chat-store";
import { toast } from "@/components/shared/toast";

/**
 * Wire SSE events from the backend to Zustand stores.
 * Returns a cleanup function that removes all listeners.
 */
export function wireSseToStores(): () => void {
  const sse = getSseClient();
  const cleanups: (() => void)[] = [];

  // ─── Gateway status ───
  cleanups.push(
    sse.on("gateway:status", (data) => {
      // Only react to gateway connection events, not project lifecycle events
      // Project lifecycle emits { projectId, state: "active"|"paused"|... }
      // Gateway connection emits { status: "connected"|"disconnected" }
      if (data.projectId) return; // Project lifecycle event — ignore for gateway store
      const connected = data.status === "connected" || data.status === "active";
      useGatewayStore.setState({
        status: connected ? "connected" : "disconnected",
      });
    }),
  );

  cleanups.push(
    sse.on("gateway:error", (data) => {
      useGatewayStore.setState({ status: "error" });
      console.error("[sse] Gateway error:", data.error);
    }),
  );

  // ─── Agents ───
  cleanups.push(
    sse.on("agent:status", (data) => {
      const store = useGatewayStore.getState();
      useGatewayStore.setState({
        agents: store.agents.map((a) =>
          a.id === data.agentId
            ? { ...a, status: data.status as typeof a.status }
            : a,
        ),
      });
    }),
  );

  cleanups.push(
    sse.on("agent:spawned", (data) => {
      const store = useGatewayStore.getState();
      // Only add if not already present
      if (!store.agents.find((a) => a.id === data.agentId)) {
        useGatewayStore.setState({
          agents: [
            ...store.agents,
            {
              id: data.agentId,
              name: data.agentId,
              role: "developer",
              status: "online",
              capabilities: [],
              permissions: {
                read: true,
                write: true,
                exec: true,
                web_search: true,
                sessions_send: true,
                sessions_spawn: false,
              },
              sessionCountToday: 0,
              avgResponseMs: 0,
              lastActivityAt: Date.now(),
              uptime: 0,
            },
          ],
        });
      }
    }),
  );

  cleanups.push(
    sse.on("agent:ended", (data) => {
      const store = useGatewayStore.getState();
      useGatewayStore.setState({
        agents: store.agents.filter((a) => a.id !== data.agentId),
      });
    }),
  );

  cleanups.push(
    sse.on("agent:heartbeat", (data) => {
      // Update project heartbeat status
      const ps = useProjectsStore.getState();
      useProjectsStore.setState({
        projects: ps.projects.map((p) =>
          p.id === data.projectId ? { ...p, updatedAt: Date.now() } : p,
        ),
      });
    }),
  );

  // ─── Tasks ───

  // Backend SSE emits raw DB status values (e.g. "in_progress", "assigned")
  // but frontend columns use "progress". Normalize before merging.
  const BACKEND_STATUS_MAP: Record<string, string> = {
    in_progress: "progress",
    assigned: "progress",
  };

  cleanups.push(
    sse.on("task:updated", (data) => {
      const ps = useProjectsStore.getState();
      const tasks = ps.tasks[data.projectId] ?? [];
      // Extract only known Task fields from SSE data to avoid type widening
      const { projectId: _pid, taskId: _tid, ...updates } = data;
      // Normalize backend status to frontend status
      if (typeof updates.status === "string" && BACKEND_STATUS_MAP[updates.status]) {
        updates.status = BACKEND_STATUS_MAP[updates.status];
      }
      // Toast when task is reset due to agent going offline
      if (updates.reason === "agent_offline" && updates.status === "backlog") {
        const resetTask = tasks.find((t) => t.id === data.taskId);
        if (resetTask) {
          toast("info", `Task "${resetTask.title}" reset to backlog (agent offline)`);
        }
      }

      useProjectsStore.setState({
        tasks: {
          ...ps.tasks,
          [data.projectId]: tasks.map((t) =>
            t.id === data.taskId
              ? { ...t, ...(updates as Partial<Task>), updatedAt: Date.now() }
              : t,
          ),
        },
      });
    }),
  );

  cleanups.push(
    sse.on("task:blocked", (data) => {
      const ps = useProjectsStore.getState();
      const tasks = ps.tasks[data.projectId] ?? [];
      useProjectsStore.setState({
        tasks: {
          ...ps.tasks,
          [data.projectId]: tasks.map((t) =>
            t.id === data.taskId
              ? {
                  ...t,
                  status: "blocked" as const,
                  updatedAt: Date.now(),
                }
              : t,
          ),
        },
      });
    }),
  );

  // ─── Execution logs ───
  cleanups.push(
    sse.on("execution:log", (data) => {
      // Append to the task's execution log
      const ps = useProjectsStore.getState();
      for (const [pid, tasks] of Object.entries(ps.tasks)) {
        const task = tasks.find((t) => t.id === data.taskId);
        if (task) {
          useProjectsStore.setState({
            tasks: {
              ...ps.tasks,
              [pid]: tasks.map((t) =>
                t.id === data.taskId
                  ? {
                      ...t,
                      executionLog: [
                        ...(t.executionLog ?? []),
                        {
                          role: data.role as "user" | "assistant" | "tool" | "system",
                          content: data.content,
                          timestamp: Date.now(),
                        },
                      ],
                    }
                  : t,
              ),
            },
          });
          break;
        }
      }
    }),
  );

  // ─── Delegation ───
  cleanups.push(
    sse.on("delegation:status", (data) => {
      const ps = useProjectsStore.getState();
      const tasks = ps.tasks[data.projectId] ?? [];
      useProjectsStore.setState({
        tasks: {
          ...ps.tasks,
          [data.projectId]: tasks.map((t) =>
            t.id === data.taskId
              ? {
                  ...t,
                  delegationStatus: data.status as typeof t.delegationStatus,
                  updatedAt: Date.now(),
                }
              : t,
          ),
        },
      });
    }),
  );

  // ─── Lead standup ───
  cleanups.push(
    sse.on("lead:standup", (data) => {
      useNotificationsStore.getState().push({
        type: "info",
        title: "Lead Standup",
        message: data.report,
        projectId: data.projectId,
      });
    }),
  );

  // ─── Notifications ───
  cleanups.push(
    sse.on("notification", (data) => {
      useNotificationsStore.getState().push({
        type: (data.type as "info" | "success" | "warning" | "error") ?? "info",
        title: data.title,
        message: data.body ?? "",
      });
    }),
  );

  // ─── Chat (agent replies) ───
  cleanups.push(
    sse.on("chat:message", (data) => {
      if (data.sessionKey && data.message) {
        useChatStore.getState().receiveMessage(data.sessionKey, {
          id: data.message.id,
          role: data.message.role as "agent",
          content: data.message.content,
          timestamp: data.message.timestamp,
        });
      }
    }),
  );

  cleanups.push(
    sse.on("chat:thinking", (data) => {
      if (data.sessionKey) {
        useChatStore.getState().setThinking(data.sessionKey, data.thinking);
      }
    }),
  );

  // ─── Health tick ───
  cleanups.push(
    sse.on("health:tick", (data) => {
      useGatewayStore.setState({ _lastTickAt: Date.now() });

      // Update agent statuses from gateway health data
      const healthAgents = (data as { agents?: Array<{ id: string; name: string; status: string }> }).agents;
      if (healthAgents?.length) {
        const store = useGatewayStore.getState();
        const updated = store.agents.map((a) => {
          const match = healthAgents.find((h) => h.name === a.name || h.id === a.id);
          return match ? { ...a, status: match.status as typeof a.status } : a;
        });
        useGatewayStore.setState({ agents: updated });
      }
    }),
  );

  return () => cleanups.forEach((fn) => fn());
}
