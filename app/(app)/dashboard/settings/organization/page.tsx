"use client";

import { OrganizationProfile, useOrganization } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk";

export default function OrganizationSettingsPage() {
  const { organization } = useOrganization();

  if (!organization) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-foreground-soft">
            You are using a personal account. Create or join an organization to collaborate with your team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
      <OrganizationProfile
        appearance={{
          ...clerkAppearance,
          elements: {
            ...clerkAppearance.elements,
            rootBox: "w-full max-w-3xl",
            cardBox: "!w-full !shadow-none !border-0",
            card: "!rounded-lg !border !border-[#27272a] !bg-[#18181b] !bg-none !shadow-none",
          },
        }}
      />
    </div>
  );
}
