"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MODELS = [
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", cost: "~$3/MTok", badge: "Recommended" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "Anthropic", cost: "~$0.8/MTok", badge: "Economical" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", cost: "~$0.1/MTok", badge: "Ultra fast" },
  { id: "skip", name: "Configure later", provider: "", cost: "", badge: "" },
];

export default function OnboardingModelPage() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent") || "personal";
  const [selected, setSelected] = useState("claude-sonnet-4-6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFinish() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mc/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          intent,
          default_model: selected === "skip" ? null : selected,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed (${res.status})`);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }

  function handleSkip() {
    // Mark completed without model selection
    fetch("/api/mc/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true, intent }),
    });
    router.push("/dashboard");
  }

  const stepLabel = intent === "team" ? "Step 4 of 4" : "Step 2 of 2";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{stepLabel} — Default model</p>
        <button onClick={handleSkip} className="text-xs text-accent hover:text-accent/80 transition">
          Skip
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Choose a default model</h1>
        <p className="mt-1 text-sm text-foreground-soft">
          Which model should your agents use? Available models depend on providers configured in your gateway.
        </p>
      </div>

      <div className="space-y-2">
        {MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelected(model.id)}
            className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition ${
              selected === model.id
                ? "border-accent bg-accent/[0.06]"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-foreground">{model.name}</p>
              {model.provider && (
                <p className="text-xs text-foreground-muted">{model.provider} {model.cost && `· ${model.cost}`}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {model.badge && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/20">
                  {model.badge}
                </span>
              )}
              <span className={`h-4 w-4 rounded-full border-2 ${
                selected === model.id ? "border-accent bg-accent" : "border-line"
              }`} />
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleFinish}
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
      >
        {loading ? "Setting up…" : "Get started"}
      </button>
    </div>
  );
}
