"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function OnboardingOrgPage() {
  const router = useRouter();
  const { createOrganization } = useOrganizationList();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handleContinue() {
    if (!name.trim() || !createOrganization) return;
    setLoading(true);
    setError("");

    try {
      await createOrganization({ name: name.trim(), slug: slug || undefined });
      router.push("/onboarding/invite");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Step 1 of 4 — Create organization</p>
        <a href="/dashboard" className="text-xs text-accent hover:text-accent/80 transition">
          Skip all
        </a>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create your organization</h1>
        <p className="mt-1 text-sm text-foreground-soft">Your team will share agents, projects, and analytics.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">Organization name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Labs"
            className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">URL</label>
          <div className="mt-1 flex items-center rounded-md border border-line bg-surface-strong overflow-hidden">
            <span className="px-3 py-2.5 text-sm text-foreground-muted bg-surface border-r border-line">rikuchan.tech/org/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <button
        onClick={handleContinue}
        disabled={!name.trim() || loading}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Continue"}
      </button>
    </div>
  );
}
