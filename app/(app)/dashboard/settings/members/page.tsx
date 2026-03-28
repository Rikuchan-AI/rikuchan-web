"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { Mail, MoreVertical, Shield, UserPlus, X } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";

type Role = "org:admin" | "org:member";

function roleLabel(role: string): string {
  return role === "org:admin" ? "Admin" : "Operator";
}

function roleBadgeClass(role: string): string {
  return role === "org:admin"
    ? "bg-accent/10 text-accent border-accent/20"
    : "bg-blue-500/10 text-blue-400 border-blue-500/20";
}

export default function MembersPage() {
  const { organization, memberships, invitations } = useOrganization({
    memberships: { pageSize: 50 },
    invitations: { pageSize: 50 },
  });
  const { user: currentUser } = useUser();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("org:member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!organization) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-foreground-soft">Create an organization to manage team members.</p>
        </div>
      </div>
    );
  }

  const memberList = memberships?.data || [];
  const pendingInvites = invitations?.data || [];
  const totalMembers = memberList.length;

  async function handleInvite() {
    if (!inviteEmail.trim() || !organization) return;
    setSending(true);
    setError("");
    try {
      await organization.inviteMember({
        emailAddress: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      setShowInvite(false);
      invitations?.revalidate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  async function handleChangeRole(userId: string, newRole: Role) {
    if (!organization) return;
    try {
      await organization.updateMember({ userId, role: newRole });
      memberships?.revalidate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change role");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!organization) return;
    // Prevent removing last admin
    const adminCount = memberList.filter((m) => m.role === "org:admin").length;
    const member = memberList.find((m) => m.publicUserData?.userId === userId);
    if (member?.role === "org:admin" && adminCount <= 1) {
      setError("Cannot remove the last admin");
      return;
    }
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await organization.removeMember(userId);
      memberships?.revalidate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    }
  }

  async function handleRevokeInvite(invitationId: string) {
    try {
      const invite = pendingInvites.find((i) => i.id === invitationId);
      if (invite) {
        await invite.revoke();
        invitations?.revalidate?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke invite");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Members</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {organization.name} · {totalMembers} member{totalMembers !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition"
        >
          <UserPlus size={16} />
          Invite member
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">
          {error}
          <button aria-label="Dismiss" onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Invite dialog */}
      {showInvite && (
        <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Invite a new member</p>
            <button aria-label="Close" onClick={() => setShowInvite(false)} className="text-foreground-muted hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-md border border-line bg-surface-strong px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
            />
            <Combobox
              value={inviteRole}
              onChange={(v) => setInviteRole(v as Role)}
              options={[
                { id: "org:member", label: "Operator" },
                { id: "org:admin", label: "Admin" },
              ]}
              placeholder="Select role"
            />
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || sending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="rounded-lg border border-line bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-strong">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">Joined</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {memberList.map((member) => {
              const userData = member.publicUserData;
              const isCurrentUser = userData?.userId === currentUser?.id;
              const adminCount = memberList.filter((m) => m.role === "org:admin").length;
              const isLastAdmin = member.role === "org:admin" && adminCount <= 1;

              return (
                <tr key={member.id} className="border-b border-line/50 hover:bg-surface-strong/50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {userData?.firstName} {userData?.lastName}
                        {isCurrentUser && <span className="ml-1 text-xs text-foreground-muted">(you)</span>}
                      </p>
                      <p className="text-xs text-foreground-muted">{userData?.identifier}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isCurrentUser || isLastAdmin ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${roleBadgeClass(member.role)}`}>
                        {roleLabel(member.role)}
                      </span>
                    ) : (
                      <Combobox
                        value={member.role}
                        onChange={(v) => handleChangeRole(userData?.userId || "", v as Role)}
                        options={[
                          { id: "org:admin", label: "Admin" },
                          { id: "org:member", label: "Operator" },
                        ]}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {!isCurrentUser && !isLastAdmin && (
                      <button
                        onClick={() => handleRemoveMember(userData?.userId || "")}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Pending invites */}
            {pendingInvites.map((invite) => (
              <tr key={invite.id} className="border-b border-line/50 bg-surface-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-foreground-muted" />
                    <div>
                      <p className="text-foreground-soft">{invite.emailAddress}</p>
                      <p className="text-xs text-foreground-muted">Pending invite</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${roleBadgeClass(invite.role || "org:member")}`}>
                    {roleLabel(invite.role || "org:member")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-foreground-muted">
                  Sent {new Date(invite.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
