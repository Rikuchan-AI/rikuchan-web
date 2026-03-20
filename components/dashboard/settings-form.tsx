"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/shared/button";
import { clientConnectProvider, clientDisconnectProvider } from "@/lib/gateway-client";

type ProviderStatus = {
  provider: string;
  connected: boolean;
  auth_kind: string | null;
  last_validated_at: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google AI",
  xai: "xAI",
  deepseek: "DeepSeek",
  mistral: "Mistral",
};

export function SettingsForm({
  initialProviders,
  workspaceName,
}: {
  initialProviders: ProviderStatus[];
  workspaceName: string;
}) {
  const { getToken } = useAuth();
  const [providers, setProviders] = useState(initialProviders);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectKey, setConnectKey] = useState("");
  const [connectProvider, setConnectProvider] = useState<string | null>(null);

  async function handleConnect(provider: string) {
    if (!connectKey.trim()) return;
    setConnecting(provider);
    try {
      const token = await getToken();
      if (!token) return;
      await clientConnectProvider(token, provider, connectKey.trim());
      setProviders((prev) =>
        prev.map((p) => (p.provider === provider ? { ...p, connected: true, auth_kind: "api_key" } : p)),
      );
      setConnectProvider(null);
      setConnectKey("");
    } catch (e) {
      console.error("Failed to connect provider:", e);
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${PROVIDER_LABELS[provider] || provider}?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await clientDisconnectProvider(token, provider);
      setProviders((prev) =>
        prev.map((p) => (p.provider === provider ? { ...p, connected: false, auth_kind: null } : p)),
      );
    } catch (e) {
      console.error("Failed to disconnect provider:", e);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-line bg-surface p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Workspace settings</p>
        <h2 className="mt-4 text-[1.75rem] font-semibold text-foreground">Keep the admin area clean and operational</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            Workspace name
            <input
              type="text"
              defaultValue={workspaceName}
              className="mt-2 w-full rounded-md border border-line-strong bg-surface-muted px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Provider connections</p>
        <p className="mt-3 text-sm text-foreground-soft">Connect your own provider API keys for direct access.</p>
        <div className="mt-6 space-y-3">
          {providers.map((p) => (
            <div key={p.provider}>
              <div className="flex items-center justify-between rounded-md border border-line bg-surface-muted p-4">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${p.connected ? "bg-accent" : "bg-foreground-muted"}`} />
                  <span className="text-sm font-medium text-foreground">{PROVIDER_LABELS[p.provider] || p.provider}</span>
                  {p.connected && p.auth_kind && (
                    <span className="rounded bg-surface-strong px-2 py-0.5 text-xs text-foreground-muted">{p.auth_kind}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {p.connected ? (
                    <Button variant="ghost" size="md" onClick={() => handleDisconnect(p.provider)}>Disconnect</Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setConnectProvider(connectProvider === p.provider ? null : p.provider)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
              {connectProvider === p.provider && !p.connected && (
                <div className="mt-2 flex gap-3 rounded-md border border-line bg-surface p-4">
                  <input
                    type="password"
                    value={connectKey}
                    onChange={(e) => setConnectKey(e.target.value)}
                    placeholder={`${PROVIDER_LABELS[p.provider] || p.provider} API key`}
                    className="flex-1 rounded-md border border-line-strong bg-surface-muted px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleConnect(p.provider)}
                  />
                  <Button size="md" onClick={() => handleConnect(p.provider)} disabled={connecting === p.provider || !connectKey.trim()}>
                    {connecting === p.provider ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-danger/25 bg-danger-soft p-6">
        <p className="mono text-xs uppercase tracking-[0.18em] text-danger">Danger zone</p>
        <h3 className="mt-4 text-xl font-semibold text-foreground">Workspace deletion stays intentionally hard</h3>
        <p className="mt-3 max-w-[720px] text-sm leading-7 text-foreground-soft">
          Keep destructive actions separate from normal admin tasks so the settings page remains clear and low-risk.
        </p>
        <div className="mt-6">
          <Button variant="secondary" size="lg" className="border-danger/30 bg-transparent text-danger hover:bg-danger-soft">
            Delete workspace
          </Button>
        </div>
      </section>
    </div>
  );
}
