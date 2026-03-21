"use client";

import { HeartbeatModelSelector } from "@/components/mc/settings/HeartbeatModelSelector";
import { LeadBoardAgentSelector } from "@/components/mc/settings/LeadBoardAgentSelector";
import { FreeModelsCatalog } from "@/components/mc/settings/FreeModelsCatalog";
import { AgentGlobalDefaults } from "@/components/mc/settings/AgentGlobalDefaults";

export default function MCSettingsPage() {
  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold tracking-[-0.03em] text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Mission Control Settings
      </h2>

      <div className="space-y-6">
        <HeartbeatModelSelector />

        <LeadBoardAgentSelector />

        <FreeModelsCatalog loading={false} />

        <AgentGlobalDefaults />
      </div>
    </div>
  );
}
