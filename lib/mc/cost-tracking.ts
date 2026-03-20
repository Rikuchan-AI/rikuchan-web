import type { Task } from "./types-project";
import { MODEL_GROUPS } from "./models";

export interface TaskCost {
  taskId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // USD
  model: string;
}

/**
 * Look up per-million-token pricing for a model from MODEL_GROUPS.
 * Returns { inputCost, outputCost } in USD per 1M tokens, or undefined
 * if the model is not found.
 */
function findModelPricing(
  modelId: string,
): { inputCost: number; outputCost: number } | undefined {
  for (const group of MODEL_GROUPS) {
    for (const model of group.models) {
      if (model.id === modelId) {
        if (model.inputCost != null && model.outputCost != null) {
          return { inputCost: model.inputCost, outputCost: model.outputCost };
        }
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Estimate cost of a task based on its executionLog messages and a model ID.
 *
 * - User / system / tool messages are counted as input tokens
 * - Assistant messages are counted as output tokens
 * - Rough estimate: 1 character ~ 0.25 tokens
 * - Cost = (tokens / 1_000_000) * costPerMillionTokens
 */
export function estimateTaskCost(task: Task, modelId: string): TaskCost {
  let inputChars = 0;
  let outputChars = 0;

  if (task.executionLog) {
    for (const msg of task.executionLog) {
      if (msg.role === "assistant") {
        outputChars += msg.content.length;
      } else {
        // user, system, tool messages count as input
        inputChars += msg.content.length;
      }
    }
  }

  const inputTokens = Math.round(inputChars * 0.25);
  const outputTokens = Math.round(outputChars * 0.25);

  const pricing = findModelPricing(modelId);
  let estimatedCost = 0;

  if (pricing) {
    estimatedCost =
      (inputTokens / 1_000_000) * pricing.inputCost +
      (outputTokens / 1_000_000) * pricing.outputCost;
  }

  return {
    taskId: task.id,
    inputTokens,
    outputTokens,
    estimatedCost: Math.round(estimatedCost * 1_000_000) / 1_000_000, // 6 decimal precision
    model: modelId,
  };
}
