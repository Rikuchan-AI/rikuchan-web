"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Key, Plus, Copy, Check, RotateCcw, Trash2, Shield, Clock, Zap, AlertTriangle } from "lucide-react";
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

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  async function refreshKeys() {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000"}/v1/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setKeys(await res.json());
    } catch {}
  }

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
      await refreshKeys();
    } catch {
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
    } catch {
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
      toast.success("API key rotated — copy the new key");
      await refreshKeys();
    } catch {
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-accent" />
            <span className="mono text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">API Access</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            API Keys
          </h2>
          <p className="mt-1.5 max-w-[600px] text-sm text-foreground-soft leading-relaxed">
            Create keys for apps, local runtimes, and integrations. Keys grant access to your workspace gateway.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-deep transition-colors"
        >
          <Plus size={14} />
          Generate Key
        </button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-accent" />
            <p className="text-sm font-semibold text-accent">Copy your key now — it won&apos;t be shown again</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-surface px-4 py-3 font-mono text-sm text-foreground break-all border border-line">
              {newKey.key}
            </code>
            <button
              onClick={() => handleCopy(newKey.key)}
              className="flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="rounded-md px-3 py-2.5 text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create key inline form */}
      {showCreate && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Create new API key</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground-muted mb-1.5">Key name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 100))}
                placeholder="e.g. Production app, Local dev"
                className="w-full rounded-md border border-line bg-surface-strong px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent/40 focus:outline-none transition-colors"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              {name.length >= 90 && (
                <span className="mt-1 block text-[10px] text-warning">{100 - name.length} characters remaining</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-deep disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setName(""); }}
                className="rounded-lg border border-line px-4 py-2.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active keys */}
      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line py-16">
          <Key size={24} className="text-foreground-muted/30" />
          <p className="text-sm text-foreground-muted">No API keys yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-accent hover:text-accent-deep transition-colors"
          >
            Generate your first key
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active keys table */}
          {activeKeys.length > 0 && (
            <div>
              <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted mb-3 px-1">
                Active ({activeKeys.length})
              </p>
              <div className="rounded-lg border border-line overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line bg-surface-muted/50">
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Key</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-foreground-muted uppercase tracking-wider hidden md:table-cell">Scopes</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-foreground-muted uppercase tracking-wider hidden lg:table-cell">Last Used</th>
                      <th className="px-4 py-3 text-left text-[11px] font-medium text-foreground-muted uppercase tracking-wider hidden lg:table-cell">Rate</th>
                      <th className="px-4 py-3 text-right text-[11px] font-medium text-foreground-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeKeys.map((key) => (
                      <tr key={key.key_prefix} className="border-b border-line/50 last:border-b-0 hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-foreground">{key.name}</p>
                          <p className="text-[10px] text-foreground-muted/60 mt-0.5">
                            Created {timeAgo(key.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <code className="rounded bg-surface-strong px-2 py-1 font-mono text-xs text-foreground-muted">
                            {key.key_prefix}...
                          </code>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.map((scope) => (
                              <span key={scope} className="flex items-center gap-1 rounded bg-surface-strong px-1.5 py-0.5 text-[10px] text-foreground-muted">
                                <Shield size={8} />
                                {scope}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                            <Clock size={10} />
                            {timeAgo(key.last_used_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
                            <Zap size={10} />
                            {key.rate_limit_rpm} rpm
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRotate(key.key_prefix)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
                              title="Rotate key"
                            >
                              <RotateCcw size={13} />
                            </button>
                            <button
                              onClick={() => handleRevoke(key.key_prefix)}
                              disabled={revoking === key.key_prefix}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
                              title="Revoke key"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Revoked keys */}
          {revokedKeys.length > 0 && (
            <div>
              <p className="mono text-[10px] uppercase tracking-wider text-foreground-muted/60 mb-3 px-1">
                Revoked ({revokedKeys.length})
              </p>
              <div className="rounded-lg border border-line/50 overflow-hidden opacity-60">
                {revokedKeys.map((key) => (
                  <div key={key.key_prefix} className="flex items-center justify-between px-4 py-3 border-b border-line/30 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-danger-soft px-2 py-0.5 text-[9px] font-semibold uppercase text-danger">Revoked</span>
                      <span className="text-sm text-foreground-muted">{key.name}</span>
                      <code className="font-mono text-xs text-foreground-muted/60">{key.key_prefix}...</code>
                    </div>
                    <span className="text-xs text-foreground-muted/40">{timeAgo(key.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
