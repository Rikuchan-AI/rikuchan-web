"use client";

import { getSseClient } from "./sse-client";
import { useGatewayStore } from "./gateway-store";
import { useProjectsStore } from "./projects-store";
import { useNotificationsStore } from "./notifications-store";
import type { Task } from "./types-project";

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
  cleanups.push(
    sse.on("task:updated", (data) => {
      const ps = useProjectsStore.getState();
      const tasks = ps.tasks[data.projectId] ?? [];
      // Extract only known Task fields from SSE data to avoid type widening
      const { projectId: _pid, taskId: _tid, ...updates } = data;
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

  // ─── Health tick ───
  cleanups.push(
    sse.on("health:tick", () => {
      useGatewayStore.setState({ _lastTickAt: Date.now() });
    }),
  );

  return () => cleanups.forEach((fn) => fn());
}
