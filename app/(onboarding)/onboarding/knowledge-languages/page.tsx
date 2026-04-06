"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LANGUAGES = [
  { code: "pt", label: "Portugues", flag: "PT" },
  { code: "en", label: "Ingles", flag: "EN" },
  { code: "es", label: "Espanhol", flag: "ES" },
  { code: "fr", label: "Frances", flag: "FR" },
] as const;

export default function OnboardingKnowledgeLanguagesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent") || "personal";
  const orgType = params.get("orgType") || "general";
  const [selected, setSelected] = useState<Set<string>>(new Set(["pt"]));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        if (next.size > 1) next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function handleContinue() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/mc/onboarding/knowledge-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgType,
          orgDescription: description || undefined,
          corpusLanguages: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed (${res.status})`);
        setSaving(false);
        return;
      }
      router.push(`/onboarding/model?intent=${intent}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSaving(false);
    }
  }

  function handleSkip() {
    // Save with defaults
    fetch("/api/mc/onboarding/knowledge-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgType, corpusLanguages: ["pt"] }),
    });
    router.push(`/onboarding/model?intent=${intent}`);
  }

  const stepLabel = intent === "team" ? "Step 4 of 5" : "Step 3 of 3";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{stepLabel} — Languages &amp; Description</p>
        <button onClick={handleSkip} className="text-xs text-accent hover:text-accent/80 transition">
          Skip
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Document languages</h1>
        <p className="mt-1 text-sm text-foreground-soft">
          Which languages are your documents written in? This optimizes text search.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            onClick={() => toggle(code)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              selected.has(code)
                ? "border-accent bg-accent/[0.06] text-accent"
                : "border-line bg-surface text-foreground-soft hover:border-line-strong"
            }`}
          >
            <span className="text-xs font-bold opacity-60">{flag}</span>
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Describe your company <span className="text-foreground-muted">(optional)</span>
        </label>
        <p className="mt-0.5 text-xs text-foreground-muted">Helps the AI give more contextualized answers.</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Somos uma software house que desenvolve produtos SaaS para o mercado financeiro."
          rows={3}
          maxLength={2000}
          className="mt-2 w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleContinue}
        disabled={saving || selected.size === 0}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}
