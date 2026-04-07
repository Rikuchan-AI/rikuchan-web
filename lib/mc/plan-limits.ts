import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.RIKUCHAN_API_URL || "http://localhost:3002";

export class LimitExceededError extends Error {
  resource: string;
  limit: number;
  current: number;

  constructor(resource: string, limit: number, current: number) {
    super(`Plan limit exceeded for ${resource}: ${current}/${limit}`);
    this.name = "LimitExceededError";
    this.resource = resource;
    this.limit = limit;
    this.current = current;
  }
}

/**
 * Check if a tenant has reached a plan limit for a given resource.
 * Throws LimitExceededError if the limit is exceeded.
 */
export async function checkLimit(
  _tenantId: string,
  resource: string,
  projectId?: string,
): Promise<void> {
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API_URL}/api/plan-limits/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ resource, project_id: projectId }),
    signal: AbortSignal.timeout(5000),
  });

  if (res.status === 429) {
    const data = await res.json();
    const details = data.error?.details || {};
    throw new LimitExceededError(
      details.resource || resource,
      details.limit || 0,
      details.current || 0,
    );
  }
}

export function invalidatePlanCache(_tenantId: string): void {
  // Cache is now server-side in rikuchan-api
}
