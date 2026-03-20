"use client";

import { useParams } from "next/navigation";
import { useProjectTasks } from "@/lib/mc/projects-store";
import { TASK_COLUMNS } from "@/lib/mc/types-project";
import { TaskCard } from "@/components/mc/projects/TaskCard";

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const tasks = useProjectTasks(projectId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-xs text-foreground-muted" style={{ letterSpacing: "0.12em" }}>
          {tasks.length} TASKS
        </p>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {TASK_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="space-y-3">
              {/* Column header */}
              <div className="flex items-center justify-between">
                <h3
                  className="mono text-xs uppercase text-foreground-muted font-semibold"
                  style={{ letterSpacing: "0.12em" }}
                >
                  {col.label}
                </h3>
                <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted font-medium">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-2 min-h-[100px]">
                {columnTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line p-4 text-center">
                    <p className="text-xs text-foreground-muted">No tasks</p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
