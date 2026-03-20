"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/shared/button";
import { useToast } from "@/components/shared/toast";
import { clientCreateApiKey, clientRevokeApiKey, clientRotateApiKey } from "@/lib/gateway-client";
import type { ApiKeyCreated } from "@/lib/gateway-client";

type ApiKey = {
  id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_rpm: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ApiKeyList({ initialKeys }: { initialKeys: ApiKey[] }) {
  const { getToken } = useAuth();
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const created = await clientCreateApiKey(token, { name: name.trim() });
      setNewKey(created);
      setName("");
      setShowCreate(false);
      toast.success("API key created");
      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000"}/v1/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setKeys(await res.json());
    } catch (e) {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(prefix: string) {
    if (!confirm(`Revoke key ${prefix}...? This cannot be undone.`)) return;
    setRevoking(prefix);
    try {
      const token = await getToken();
      if (!token) return;
      await clientRevokeApiKey(token, prefix);
      setKeys((prev) => prev.map((k) => (k.key_prefix === prefix ? { ...k, is_active: false } : k)));
      toast.success("API key revoked");
    } catch (e) {
      toast.error("Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  }

  async function handleRotate(prefix: string) {
    if (!confirm(`Rotate key ${prefix}...? The old key will stop working immediately.`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      const created = await clientRotateApiKey(token, prefix);
      setNewKey(created);
      toast.success("API key rotated");
      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000"}/v1/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setKeys(await res.json());
    } catch (e) {
      toast.error("Failed to rotate key");
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent">API access</p>
          <h2 className="mt-3 text-[1.8rem] font-semibold text-foreground">Manage workspace API keys</h2>
          <p className="mt-2 max-w-[720px] text-sm leading-7 text-foreground-soft">
            Create keys for apps, local runtimes, and controlled integrations without exposing provider credentials directly.
          </p>
        </div>
        <Button size="lg" onClick={() => setShowCreate(true)}>Generate key</Button>
      </section>

      {/* New key banner */}
      {newKey && (
        <div className="rounded-lg border border-accent/30 bg-accent-soft p-6">
          <p className="text-sm font-semibold text-accent">New API key created — copy it now. It won&apos;t be shown again.</p>
          <div className="mt-3 flex items-center gap-3">
            <code className="flex-1 rounded-md bg-surface-muted px-4 py-3 font-mono text-sm text-foreground break-all">
              {newKey.key}
            </code>
            <Button variant="secondary" onClick={() => handleCopy(newKey.key)}>
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="ghost" onClick={() => setNewKey(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      {/* Create key dialog */}
      {showCreate && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h3 className="text-lg font-semibold text-foreground">Create new API key</h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-medium text-foreground">
              Key name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 100))}
                placeholder="e.g. Production app"
                className={`mt-2 w-full rounded-md border bg-surface-muted px-4 py-3 text-sm text-foreground outline-none focus:border-accent ${name.length >= 100 ? "border-warning" : "border-line-strong"}`}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              {name.length >= 100 && (
                <span className="mt-1 block text-xs text-warning">Maximum 100 characters</span>
              )}
            </label>
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Key list */}
      <section className="space-y-4">
        {keys.length === 0 && (
          <div className="rounded-lg border border-line bg-surface p-8 text-center">
            <p className="text-foreground-soft">No API keys yet. Create one to get started.</p>
          </div>
        )}
        {keys.map((key) => (
          <div key={key.key_prefix} className={`rounded-lg border bg-surface p-6 ${key.is_active ? "border-line" : "border-danger/20 opacity-60"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{key.name}</h3>
                <p className="mt-1 font-mono text-sm text-foreground-soft">{key.scopes.join(" ")}</p>
                <p className="mt-1 font-mono text-xs text-foreground-muted">{key.key_prefix}...</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${key.is_active ? "bg-success-soft text-accent" : "bg-danger-soft text-danger"}`}>
                  {key.is_active ? "Active" : "Revoked"}
                </span>
                {key.is_active && (
                  <>
                    <Button variant="secondary" size="md" onClick={() => handleRotate(key.key_prefix)}>Rotate</Button>
                    <Button variant="ghost" size="md" onClick={() => handleRevoke(key.key_prefix)} disabled={revoking === key.key_prefix}>
                      {revoking === key.key_prefix ? "Revoking..." : "Revoke"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-sm text-foreground-soft">
              <span>Last used {timeAgo(key.last_used_at)}</span>
              <span>Rate limit: {key.rate_limit_rpm} rpm</span>
              {key.expires_at && <span>Expires {new Date(key.expires_at).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
