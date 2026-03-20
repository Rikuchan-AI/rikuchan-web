import type { Project } from "./types-project";

function sanitizeSessionScope(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "default";
}

export function getProjectSessionScope(project: Pick<Project, "id" | "groupId">): string {
  if (project.groupId) return `group-${sanitizeSessionScope(project.groupId)}`;
  return `project-${sanitizeSessionScope(project.id)}`;
}

export function buildAgentSessionKey(
  agentId: string,
  project: Pick<Project, "id" | "groupId">,
  groupAgentId?: string,
): string {
  const effectiveAgentId = groupAgentId ?? agentId;
  return `agent:${effectiveAgentId}:${getProjectSessionScope(project)}`;
}
