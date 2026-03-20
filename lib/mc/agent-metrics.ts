import type { Task } from "./types-project";

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalTasks: number;
  completed: number;
  blocked: number;
  inProgress: number;
  successRate: number; // 0-100
  avgCompletionMs: number;
  totalTokensEstimate: number;
}

/**
 * Calculate per-agent performance metrics from a list of tasks and a roster.
 *
 * - Groups tasks by `assignedAgentId`
 * - successRate = completed / (completed + blocked) * 100
 * - avgCompletionMs from tasks with both startedAt and completedAt
 * - totalTokensEstimate = rough estimate from executionLog assistant message
 *   character count * 0.25
 */
export function calculateAgentMetrics(
  tasks: Task[],
  roster: Array<{ agentId: string; agentName: string }>,
): AgentMetrics[] {
  // Index roster for quick lookup
  const rosterMap = new Map<string, string>();
  for (const member of roster) {
    rosterMap.set(member.agentId, member.agentName);
  }

  // Group tasks by assignedAgentId
  const tasksByAgent = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.assignedAgentId) continue;
    const existing = tasksByAgent.get(task.assignedAgentId);
    if (existing) {
      existing.push(task);
    } else {
      tasksByAgent.set(task.assignedAgentId, [task]);
    }
  }

  // Calculate metrics for each roster member
  return roster.map((member) => {
    const agentTasks = tasksByAgent.get(member.agentId) ?? [];

    const completed = agentTasks.filter((t) => t.status === "done").length;
    const blocked = agentTasks.filter((t) => t.status === "blocked").length;
    const inProgress = agentTasks.filter(
      (t) => t.status === "progress",
    ).length;

    const denominator = completed + blocked;
    const successRate = denominator > 0 ? (completed / denominator) * 100 : 0;

    // Average completion time from tasks that have both startedAt and completedAt
    const completedWithTimes = agentTasks.filter(
      (t) => t.startedAt != null && t.completedAt != null,
    );
    const avgCompletionMs =
      completedWithTimes.length > 0
        ? completedWithTimes.reduce(
            (sum, t) => sum + (t.completedAt! - t.startedAt!),
            0,
          ) / completedWithTimes.length
        : 0;

    // Estimate tokens from executionLog assistant messages
    let totalAssistantChars = 0;
    for (const task of agentTasks) {
      if (!task.executionLog) continue;
      for (const msg of task.executionLog) {
        if (msg.role === "assistant") {
          totalAssistantChars += msg.content.length;
        }
      }
    }
    const totalTokensEstimate = Math.round(totalAssistantChars * 0.25);

    return {
      agentId: member.agentId,
      agentName: member.agentName,
      totalTasks: agentTasks.length,
      completed,
      blocked,
      inProgress,
      successRate: Math.round(successRate * 100) / 100,
      avgCompletionMs: Math.round(avgCompletionMs),
      totalTokensEstimate,
    };
  });
}
