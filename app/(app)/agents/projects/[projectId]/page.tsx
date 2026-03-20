"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/agents/projects/${projectId}/board`);
  }, [projectId, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-foreground-muted">Redirecting to board...</p>
    </div>
  );
}
