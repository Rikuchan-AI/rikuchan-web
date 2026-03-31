"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/shared/button";
import { useToast } from "@/components/shared/toast";
import { ProviderIcon } from "@/components/shared/provider-icon";
import {
  type ProviderStatus,
  clientConnectProvider,
  clientDisconnectProvider,
  clientGetProviderOAuthStatus,
  clientListProviders,
  clientStartProviderOAuth,
} from "@/lib/gateway-client";
import {
  clientGetLocalProviderOAuthStatus,
  clientStartLocalProviderOAuth,
} from "@/lib/local-agent-client";

const FAMILY_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google AI",
  xai: "xAI",
  zai_general: "Z.AI",
  deepseek: "DeepSeek",
  mistral: "Mistral",
};

const API_KEY_PLACEHOLDERS: Record<string, string> = {
  anthropic: "Anthropic API key or Claude setup token",
  openai: "OpenAI API key",
  xai: "xAI API key",
  zai_general: "Z.AI API key",
  deepseek: "DeepSeek API key",
  mistral: "Mistral API key",
};

function statusLabel(provider: ProviderStatus): string {
  if (provider.status === "ready" && provider.connected) return "Connected";
  if (provider.status === "oauth_required") return "Reconnect needed";
  if (provider.status === "oauth_supported") return "Ready to connect";
  return "Not connected";
}

function oauthButtonLabel(provider: ProviderStatus): string {
  if (provider.provider === "openai-codex") return "Connect with ChatGPT";
  if (provider.provider === "google") return "Connect with Google";
  return "Connect";
}

export function SettingsForm({
  initialProviders,
  workspaceName,
}: {
  initialProviders: ProviderStatus[];
  workspaceName: string;
}) {
  const { getToken } = useAuth();
  const toast = useToast();
  const [providers, setProviders] = useState(initialProviders);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [expandedApiKeyProvider, setExpandedApiKeyProvider] = useState<string | null>(null);
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});

  const families = providers.reduce<Record<string, ProviderStatus[]>>((acc, provider) => {
    const family = provider.family || provider.provider;
    acc[family] ||= [];
    acc[family].push(provider);
    return acc;
  }, {});

  async function refreshProviders(token: string) {
    const nextProviders = await clientListProviders(token);
    setProviders(nextProviders);
    return nextProviders;
  }

  async function handleConnectApiKey(provider: string) {
    const apiKey = (draftKeys[provider] || "").trim();
    if (!apiKey) return;

    setBusyProvider(provider);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await clientConnectProvider(token, provider, apiKey);
      await refreshProviders(token);
      setExpandedApiKeyProvider(null);
      setDraftKeys((prev) => ({ ...prev, [provider]: "" }));
      toast.success(`${result.provider} connected for this workspace`);
    } catch {
      toast.error(`Failed to connect ${provider}`);
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleStartOAuth(provider: string) {
    setBusyProvider(provider);
    try {
      const token = await getToken();
      if (!token) return;

      const session = provider === "openai-codex"
        ? await clientStartLocalProviderOAuth(provider)
        : await clientStartProviderOAuth(token, provider);
      if (!session.authorize_url) {
        throw new Error("Missing authorize URL");
      }

      const popup = window.open(session.authorize_url, "_blank", "noopener,noreferrer");
      if (!popup) {
        toast.error("Allow popups to complete the provider login");
      }

      const deadline = Date.now() + 2 * 60_000;
      let status = session.status;
      let errorMessage = session.error_message;

      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const current = provider === "openai-codex"
          ? await clientGetLocalProviderOAuthStatus(session.session_id)
          : await clientGetProviderOAuthStatus(token, session.session_id);
        status = current.status;
        errorMessage = current.error_message;

        if (status === "completed") {
          await refreshProviders(token);
          toast.success(`${provider} connected for this workspace`);
          return;
        }

        if (status === "error") {
          throw new Error(errorMessage || "OAuth connection failed");
        }
      }

      await refreshProviders(token);
      toast.error(`Timed out waiting for ${provider} login to complete`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to connect ${provider}`;
      toast.error(message);
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(`Disconnect ${provider} for the whole workspace?`)) return;

    setBusyProvider(provider);
    try {
      const token = await getToken();
      if (!token) return;
      await clientDisconnectProvider(token, provider);
      await refreshProviders(token);
      toast.success(`${provider} disconnected`);
    } catch {
      toast.error(`Failed to disconnect ${provider}`);
    } finally {
      setBusyProvider(null);
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
        <p className="mt-3 text-sm text-foreground-soft">
          Provider credentials are shared across the workspace tenant. Admins can connect or disconnect them; everyone else just uses the shared connection.
        </p>
        <div className="mt-6 space-y-4">
          {Object.entries(families).map(([family, methods]) => (
            <div key={family} className="rounded-lg border border-line bg-surface-muted">
              <div className="flex items-center gap-3 border-b border-line px-4 py-4">
                <ProviderIcon provider={family} size="sm" />
                <div>
                  <p className="text-sm font-medium text-foreground">{FAMILY_LABELS[family] || family}</p>
                  <p className="text-xs text-foreground-soft">Tenant-wide connection methods</p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {methods.map((provider) => {
                  const canEdit = provider.can_manage;
                  const isBusy = busyProvider === provider.provider;
                  const isExpanded = expandedApiKeyProvider === provider.provider;

                  return (
                    <div key={provider.provider}>
                      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${provider.connected ? "bg-accent" : "bg-foreground-muted"}`} />
                            <span className="text-sm font-medium text-foreground">{provider.display_name}</span>
                            <span className="rounded bg-surface-strong px-2 py-0.5 text-xs text-foreground-muted">
                              {statusLabel(provider)}
                            </span>
                            {provider.auth_kind && (
                              <span className="rounded bg-surface-strong px-2 py-0.5 text-xs text-foreground-muted">
                                {provider.auth_kind}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground-soft">
                            {provider.credential_mode === "oauth"
                              ? "Browser-based workspace connection"
                              : "Workspace API key storage"}
                          </p>
                          {provider.last_validated_at && (
                            <p className="text-xs text-foreground-muted">Validated at {new Date(provider.last_validated_at).toLocaleString()}</p>
                          )}
                          {!canEdit && (
                            <p className="text-xs text-foreground-muted">Admin permission required to change this connection.</p>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex gap-2">
                            {provider.connected ? (
                              <Button variant="ghost" size="md" onClick={() => handleDisconnect(provider.provider)} disabled={isBusy}>
                                {isBusy ? "Disconnecting..." : "Disconnect"}
                              </Button>
                            ) : provider.credential_mode === "oauth" ? (
                              <Button variant="secondary" size="md" onClick={() => handleStartOAuth(provider.provider)} disabled={isBusy}>
                                {isBusy ? "Waiting..." : oauthButtonLabel(provider)}
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="md"
                                onClick={() =>
                                  setExpandedApiKeyProvider(isExpanded ? null : provider.provider)
                                }
                              >
                                {isExpanded ? "Cancel" : "Connect"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {canEdit && provider.credential_mode === "api_key" && !provider.connected && isExpanded && (
                        <div className="mt-2 flex gap-3 rounded-md border border-line bg-surface p-4">
                          <input
                            type="password"
                            value={draftKeys[provider.provider] || ""}
                            onChange={(event) =>
                              setDraftKeys((prev) => ({ ...prev, [provider.provider]: event.target.value }))
                            }
                            placeholder={API_KEY_PLACEHOLDERS[provider.provider] || `${provider.display_name} API key`}
                            className="flex-1 rounded-md border border-line-strong bg-surface-muted px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                            autoFocus
                            onKeyDown={(event) => event.key === "Enter" && handleConnectApiKey(provider.provider)}
                          />
                          <Button
                            size="md"
                            onClick={() => handleConnectApiKey(provider.provider)}
                            disabled={isBusy || !(draftKeys[provider.provider] || "").trim()}
                          >
                            {isBusy ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
