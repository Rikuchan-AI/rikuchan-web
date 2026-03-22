"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";

interface OnboardingState {
  completed: boolean;
  intent: string | null;
  loading: boolean;
  markComplete: (intent?: string) => Promise<void>;
}

export function useOnboarding(): OnboardingState {
  const { organization } = useOrganization();
  const [completed, setCompleted] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/mc/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setCompleted(data.completed);
          setIntent(data.intent);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [organization?.id]);

  async function markComplete(onboardingIntent?: string) {
    await fetch("/api/mc/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true, intent: onboardingIntent }),
    });
    setCompleted(true);
    if (onboardingIntent) setIntent(onboardingIntent);
  }

  return { completed, intent, loading, markComplete };
}
