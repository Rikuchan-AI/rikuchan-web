"use client";

import { useParams } from "next/navigation";
import { useProjectsStore, selectProjectById } from "@/lib/mc/projects-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import { RosterCard } from "@/components/mc/projects/RosterCard";

export default function RosterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProjectsStore(selectProjectById(projectId));
  const agents = useGatewayStore((s) => s.agents);

  const roster = project?.roster ?? [];

  if (roster.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm mb-2">No agents in roster</p>
        <p className="text-foreground-muted text-xs">
          Add agents to this project to start collaborating.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="mono text-xs text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
        {roster.length} AGENT{roster.length !== 1 ? "S" : ""} IN ROSTER
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {roster.map((member) => {
          const agent = agents.find((a) => a.id === member.agentId);
          return (
            <RosterCard
              key={member.agentId}
              member={member}
              agentStatus={agent?.status}
              currentTask={agent?.currentTask}
              rosterMembers={roster}
              projectId={projectId}
            />
          );
        })}
      </div>
    </div>
  );
}
