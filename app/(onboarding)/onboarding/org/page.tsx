"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizationList, useOrganization } from "@clerk/nextjs";

export default function OnboardingOrgPage() {
  const router = useRouter();
  const { createOrganization, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { organization: activeOrg } = useOrganization();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If user already has an org (e.g. from a previous incomplete onboarding), skip creation
  useEffect(() => {
    if (activeOrg) {
      router.replace("/onboarding/invite");
      return;
    }
    const existing = userMemberships?.data?.[0]?.organization;
    if (existing && setActive) {
      setActive({ organization: existing.id }).then(() => {
        router.replace("/onboarding/invite");
      });
    }
  }, [activeOrg, userMemberships?.data, setActive, router]);

  async function handleSkipAll() {
    setLoading(true);
    try {
      await fetch("/api/mc/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, intent: "team" }),
      });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  async function handleContinue() {
    if (!name.trim() || !createOrganization) return;
    setLoading(true);
    setError("");

    try {
      const org = await createOrganization({ name: name.trim() });
      if (setActive) await setActive({ organization: org.id });
      router.push("/onboarding/invite");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create organization";
      // If org with this name already exists, try to continue
      if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("already")) {
        const existing = userMemberships?.data?.[0]?.organization;
        if (existing && setActive) {
          await setActive({ organization: existing.id });
          router.push("/onboarding/invite");
          return;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Step 1 of 4 — Create organization</p>
        <button onClick={handleSkipAll} disabled={loading} className="text-xs text-accent hover:text-accent/80 transition">
          Skip all
        </button>
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
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Labs"
            className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
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
