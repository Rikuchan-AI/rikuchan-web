"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";

interface TenantPlan {
  planName: string;
  plan: string;
  loading: boolean;
}

export function useTenantPlan(): TenantPlan {
  const { organization } = useOrganization();
  const [plan, setPlan] = useState<{ plan: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/mc/tenant")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPlan(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [organization?.id]);

  const displayName = plan?.display_name || "Free";
  const prefix = organization ? organization.name : "Rikuchan";

  return {
    planName: `${prefix} ${displayName}`,
    plan: plan?.plan || "free",
    loading,
  };
}
