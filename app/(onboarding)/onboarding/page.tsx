"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users } from "lucide-react";

async function markOnboardingComplete(intent: string) {
  await fetch("/api/mc/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: true, intent }),
  });
}

export default function OnboardingIntentPage() {
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);

  async function handleSkip() {
    setSkipping(true);
    try {
      await markOnboardingComplete("skipped");
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  return (
    <div className="space-y-8 text-center">
      <div>
        <p className="text-4xl">&#129438;</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Welcome to Rikuchan</h1>
        <p className="mt-2 text-sm text-foreground-soft">How will you use the platform?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => router.push("/onboarding/gateway?intent=personal")}
          className="group flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-6 text-left transition hover:border-accent/40 hover:bg-accent/[0.04]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 group-hover:bg-accent/20 transition">
            <User size={24} className="text-accent" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Personal use</p>
            <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
              Personal projects, explore agents, solo automations
            </p>
          </div>
        </button>

        <button
          onClick={() => router.push("/onboarding/org")}
          className="group flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-6 text-left transition hover:border-accent/40 hover:bg-accent/[0.04]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition">
            <Users size={24} className="text-blue-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">With my team</p>
            <p className="mt-1 text-xs text-foreground-muted leading-relaxed">
              Manage agents with your team, invite members
            </p>
          </div>
        </button>
      </div>

      <p className="text-xs text-foreground-muted">
        You can change this later in settings.{" "}
        <button onClick={handleSkip} disabled={skipping} className="text-accent hover:text-accent/80 transition">
          {skipping ? "Skipping..." : "Skip setup"}
        </button>
      </p>
    </div>
  );
}
