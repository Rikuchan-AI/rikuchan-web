"use client";

import { McApiError } from "./api-client";

export function handleMcError(error: unknown, toast?: { error: (title: string, opts?: { description?: string }) => void }) {
  if (!(error instanceof McApiError)) {
    console.error("[mc] Unexpected error:", error);
    toast?.error("Unexpected error", { description: String(error) });
    return;
  }

  console.error(`[mc] API error: ${error.code} — ${error.message}`);

  if (!toast) return;

  switch (error.code) {
    case "GATEWAY_DISCONNECTED":
      toast.error("Gateway offline", { description: "Backend cannot reach the OpenClaw gateway" });
      break;
    case "GATEWAY_TIMEOUT":
      toast.error("Gateway timeout", { description: "Try again" });
      break;
    case "INVALID_TRANSITION":
      toast.error("Invalid transition", { description: error.message });
      break;
    case "NO_LEAD_AGENT":
      toast.error("No lead agent", { description: "Configure the lead agent in project settings" });
      break;
    case "DELEGATION_FAILED":
      toast.error("Delegation failed", { description: error.message });
      break;
    case "UNAUTHORIZED":
      // Session expired — redirect to login
      if (typeof window !== "undefined") window.location.href = "/login";
      break;
    case "FORBIDDEN":
      toast.error("Permission denied");
      break;
    case "NOT_FOUND":
      toast.error("Not found", { description: error.message });
      break;
    case "VALIDATION_ERROR":
      toast.error("Invalid data", { description: error.message });
      break;
    case "LIMIT_EXCEEDED":
      toast.error("Plan limit exceeded", { description: error.message });
      break;
    default:
      toast.error(error.message);
  }
}
