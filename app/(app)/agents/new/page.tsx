"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [model, setModel] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Wire up agent creation via gateway RPC
    router.push("/agents");
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Back link */}
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Agents
      </Link>

      <h2
        className="text-xl font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Register New Agent
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Agent Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="e.g. rikuchan-dev"
            required
          />
        </div>

        {/* Role */}
        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="e.g. developer, lead, reviewer"
            required
          />
        </div>

        {/* Model */}
        <div>
          <label className="mono text-xs uppercase text-foreground-muted block mb-1.5" style={{ letterSpacing: "0.18em" }}>
            Model (optional)
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-line bg-surface-strong px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="e.g. claude-sonnet-4-20250514"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            href="/agents"
            className="h-10 px-4 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors inline-flex items-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!name || !role}
            className="h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register Agent
          </button>
        </div>
      </form>
    </div>
  );
}
