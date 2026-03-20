"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/shared/mascot";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { CheckCircle, ChevronRight, Loader2 } from "lucide-react";

type Step = "url" | "token" | "connecting" | "agents" | "done";

export function ConnectionSetup() {
  const router = useRouter();
  const connect = useGatewayStore((s) => s.connect);
  const agents = useGatewayStore((s) => s.agents);

  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("ws://127.0.0.1:18789");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const steps: Step[] = ["url", "token", "connecting", "agents", "done"];
  const stepIndex = steps.indexOf(step);

  const stepLabels: Record<Step, string> = {
    url:        "Gateway URL",
    token:      "Auth Token",
    connecting: "Connecting",
    agents:     "Agents Found",
    done:       "Ready!",
  };

  const handleConnect = async () => {
    setError("");
    setStep("connecting");
    try {
      await connect(url, token);
      setTimeout(() => {
        setStep("agents");
        setTimeout(() => {
          setStep("done");
          setTimeout(() => router.push("/dashboard"), 1500);
        }, 2000);
      }, 1000);
    } catch {
      setStep("token");
      setError("Connection failed. Check URL and token.");
    }
  };

  return (
    <div className="min-h-screen bg-background dot-grid hero-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Mascot size="lg" glow />
          <h1
            className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Rikuchan Mission Control
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">Connect to your OpenClaw gateway</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i < stepIndex
                    ? "bg-accent"
                    : i === stepIndex
                    ? "bg-accent animate-pulse"
                    : "bg-line-strong"
                }`}
              />
              {i < steps.length - 1 && (
                <div className={`w-8 h-px ${i < stepIndex ? "bg-accent/50" : "bg-line"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2
            className="text-lg font-semibold tracking-[-0.03em] text-foreground mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Step {stepIndex + 1}: {stepLabels[step]}
          </h2>

          {step === "url" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-foreground-soft">
                Enter the WebSocket URL of your OpenClaw gateway instance.
              </p>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="ws://127.0.0.1:18789"
                autoFocus
              />
              <button
                onClick={() => setStep("token")}
                disabled={!url}
                className="w-full h-11 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {step === "token" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-foreground-soft">
                Enter your authentication token. Leave empty if auth is disabled.
              </p>
              {error && <p className="text-sm text-danger">{error}</p>}
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="Optional auth token"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("url")}
                  className="flex-1 h-11 px-5 rounded-lg border border-line-strong text-sm font-medium text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConnect}
                  className="flex-1 h-11 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-deep transition-colors flex items-center justify-center gap-2"
                >
                  Connect <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === "connecting" && (
            <div className="mt-6 flex flex-col items-center py-4 gap-4">
              <Loader2 size={32} className="text-accent animate-spin" />
              <p className="text-sm text-foreground-soft">Establishing connection to {url}…</p>
            </div>
          )}

          {step === "agents" && (
            <div className="mt-4">
              <p className="text-sm text-foreground-soft mb-4">
                Found <span className="text-accent font-semibold">{agents.length}</span> agents registered in this gateway.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded-md border border-line bg-surface-muted px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{agent.name}</p>
                      <p className="text-xs text-foreground-muted">{agent.role}</p>
                    </div>
                    <span className="mono text-xs text-accent">{agent.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="mt-6 flex flex-col items-center py-4 gap-4">
              <CheckCircle size={32} className="text-accent" />
              <p className="text-sm text-accent font-semibold">Connected! Redirecting to dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
