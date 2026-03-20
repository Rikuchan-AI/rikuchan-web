"use client";

import { useState } from "react";
import { HeartbeatModelSelector } from "@/components/mc/settings/HeartbeatModelSelector";
import { LeadBoardAgentSelector } from "@/components/mc/settings/LeadBoardAgentSelector";
import { FreeModelsCatalog } from "@/components/mc/settings/FreeModelsCatalog";
import type { FreeModelEntry, FreeModelsResponse } from "@/lib/mc/free-models";

export default function MCSettingsPage() {
  // Stub: free models data will be loaded once the API is wired up
  const [freeModelsData] = useState<FreeModelsResponse | null>(null);
  const freeModelsLoading = false;
  const freeModels: FreeModelEntry[] = freeModelsData?.freeModels ?? [];

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Mission Control Settings
      </h2>

      <div className="space-y-6 max-w-2xl">
        <HeartbeatModelSelector
          freeModels={freeModels}
          freeModelsLoading={freeModelsLoading}
        />

        <LeadBoardAgentSelector />

        <FreeModelsCatalog
          data={freeModelsData}
          loading={freeModelsLoading}
        />
      </div>
    </div>
  );
}
