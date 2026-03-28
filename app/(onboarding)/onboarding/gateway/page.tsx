"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type ConnectionState = "idle" | "testing" | "success" | "error";

export default function OnboardingGatewayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent") || "personal";

  const [gatewayUrl, setGatewayUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [state, setState] = useState<ConnectionState>("idle");
  const [latency, setLatency] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function testConnection() {
    if (!gatewayUrl) return;
    setState("testing");
    setErrorMsg("");

    try {
      const t0 = performance.now();
      const res = await fetch(gatewayUrl.replace(/\/$/, "") + "/health", {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        signal: AbortSignal.timeout(10000),
      });
      const t1 = performance.now();
      setLatency(Math.round(t1 - t0));

      if (res.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorMsg(`Status ${res.status}`);
      }
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Connection failed");
    }
  }

  async function handleContinue() {
    setSaving(true);
    try {
      // Save gateway config if provided
      if (gatewayUrl) {
        await fetch("/api/mc/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gateway_url: gatewayUrl,
            gateway_token: authToken || undefined,
          }),
          signal: AbortSignal.timeout(10_000),
        });
      }
      router.push(`/onboarding/model?intent=${intent}`);
    } catch {
      setErrorMsg("Failed to save gateway configuration");
      setState("error");
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push(`/onboarding/model?intent=${intent}`);
  }

  const stepLabel = intent === "team" ? "Step 3 of 4" : "Step 1 of 2";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{stepLabel} — Connect Gateway</p>
        <button onClick={handleSkip} className="text-xs text-accent hover:text-accent/80 transition">
          Skip
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Connect your Gateway</h1>
        <p className="mt-1 text-sm text-foreground-soft">Rikuchan needs an OpenClaw Gateway to operate agents.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">Gateway URL</label>
          <input
            type="url"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            placeholder="wss://openclaw-production-XXXX.up.railway.app"
            className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Auth Token</label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter gateway auth token"
            className="mt-1 w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
          />
        </div>

        <button
          onClick={testConnection}
          disabled={!gatewayUrl || state === "testing"}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-foreground-soft hover:bg-surface-strong transition disabled:opacity-50"
        >
          {state === "testing" && <Loader2 size={14} className="inline mr-2 animate-spin" />}
          Test connection
        </button>

        {state === "success" && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle size={16} />
            Connected successfully ({latency}ms)
          </div>
        )}

        {state === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <XCircle size={16} />
            {errorMsg || "Connection failed"}
          </div>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={saving}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Continue"}
      </button>

      <p className="text-xs text-foreground-muted text-center">
        Don&apos;t have a gateway?{" "}
        <a href="https://docs.rikuchan.tech/gateway" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80">
          See how to install OpenClaw
        </a>
      </p>
    </div>
  );
}
