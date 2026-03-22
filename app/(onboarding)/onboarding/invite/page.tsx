"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { Plus, X, Info } from "lucide-react";

interface Invite {
  email: string;
  role: "org:admin" | "org:member";
}

export default function OnboardingInvitePage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [invites, setInvites] = useState<Invite[]>([{ email: "", role: "org:member" }]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function addRow() {
    setInvites([...invites, { email: "", role: "org:member" }]);
  }

  function removeRow(index: number) {
    setInvites(invites.filter((_, i) => i !== index));
  }

  function updateInvite(index: number, field: keyof Invite, value: string) {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  }

  async function handleContinue() {
    if (!organization) return;
    setSending(true);
    setError("");

    try {
      const valid = invites.filter((inv) => inv.email.trim() && inv.email.includes("@"));
      for (const inv of valid) {
        await organization.inviteMember({
          emailAddress: inv.email.trim(),
          role: inv.role,
        });
      }
      router.push("/onboarding/gateway?intent=team");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invites");
    } finally {
      setSending(false);
    }
  }

  function handleSkip() {
    router.push("/onboarding/gateway?intent=team");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Step 2 of 4 — Invite team</p>
        <button onClick={handleSkip} className="text-xs text-accent hover:text-accent/80 transition">
          Skip
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Invite your team</h1>
        <p className="mt-1 text-sm text-foreground-soft">Add team members. You can invite more people later.</p>
      </div>

      <div className="space-y-3">
        {invites.map((inv, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="email"
              value={inv.email}
              onChange={(e) => updateInvite(i, "email", e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
            />
            <select
              value={inv.role}
              onChange={(e) => updateInvite(i, "role", e.target.value)}
              className="rounded-md border border-line bg-surface-strong px-2 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="org:member">Operator</option>
              <option value="org:admin">Admin</option>
            </select>
            {invites.length > 1 && (
              <button onClick={() => removeRow(i)} className="text-foreground-muted hover:text-foreground transition">
                <X size={16} />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition"
        >
          <Plus size={14} /> Add another
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-line bg-surface-muted p-3">
        <Info size={14} className="mt-0.5 shrink-0 text-foreground-muted" />
        <p className="text-xs text-foreground-muted leading-relaxed">
          <strong className="text-foreground-soft">Admin</strong>: manages gateway, credentials, members.{" "}
          <strong className="text-foreground-soft">Operator</strong>: operates board, creates tasks, chat.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleContinue}
        disabled={sending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
      >
        {sending ? "Sending invites..." : "Continue"}
      </button>
    </div>
  );
}
