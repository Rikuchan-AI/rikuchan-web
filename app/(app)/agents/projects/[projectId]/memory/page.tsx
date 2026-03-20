"use client";

import { useParams } from "next/navigation";
import { useProjectMemory } from "@/lib/mc/projects-store";
import { MemoryCard } from "@/components/mc/projects/MemoryCard";

export default function MemoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const docs = useProjectMemory(projectId);

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted text-sm mb-2">No memory documents</p>
        <p className="text-foreground-muted text-xs">
          Memory documents store decisions, specs, notes, and files for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-xs text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
          {docs.length} DOCUMENT{docs.length !== 1 ? "S" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <MemoryCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}
