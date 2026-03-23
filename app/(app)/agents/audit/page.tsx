"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Trash2, Filter } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import { useAuditStore } from "@/lib/mc/audit-store";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import type { AuditActorType, AuditResourceType } from "@/lib/mc/audit-store";

const ACTOR_COLORS: Record<AuditActorType, string> = {
  human:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  agent:  "bg-accent/10 text-accent border-accent/20",
  system: "bg-surface-strong text-foreground-muted border-line",
};

const RESOURCE_COLORS: Record<AuditResourceType, string> = {
  project:  "text-purple-400",
  group:    "text-emerald-400",
  agent:    "text-accent",
  task:     "text-foreground-soft",
  pipeline: "text-yellow-400",
  spawn:    "text-orange-400",
  config:   "text-foreground-muted",
  budget:   "text-red-400",
};

export default function AuditLogPage() {
  const { events, hydrate, clear, export: exportLog } = useAuditStore();
  const activityEvents = useGatewayStore((s) => s.activity);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [filterActor, setFilterActor] = useState<AuditActorType | "">("");
  const [filterResource, setFilterResource] = useState<AuditResourceType | "">("");
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // Merge local audit events with gateway activity events
  const gatewayEvents = useMemo(() =>
    activityEvents.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      actorType: "agent" as AuditActorType,
      actorId: e.agentId,
      action: e.type,
      resourceType: "agent" as AuditResourceType,
      resourceId: e.agentId,
      resourceName: e.agentName,
      details: { message: e.message },
    })),
    [activityEvents],
  );

  const allEvents = useMemo(() => {
    const merged = [...events, ...gatewayEvents];
    merged.sort((a, b) => b.timestamp - a.timestamp);
    return merged;
  }, [events, gatewayEvents]);

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (filterActor && e.actorType !== filterActor) return false;
      if (filterResource && e.resourceType !== filterResource) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.action.toLowerCase().includes(q) ||
          e.actorId.toLowerCase().includes(q) ||
          (e.resourceName ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allEvents, filterActor, filterResource, search]);

  const handleExport = () => {
    const data = JSON.stringify(filtered, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ACTOR_OPTIONS: { value: AuditActorType | ""; label: string }[] = [
    { value: "", label: "All actors" },
    { value: "human",  label: "Human" },
    { value: "agent",  label: "Agent" },
    { value: "system", label: "System" },
  ];

  const RESOURCE_OPTIONS: { value: AuditResourceType | ""; label: string }[] = [
    { value: "", label: "All resources" },
    { value: "project",  label: "Project" },
    { value: "group",    label: "Group" },
    { value: "agent",    label: "Agent" },
    { value: "task",     label: "Task" },
    { value: "pipeline", label: "Pipeline" },
    { value: "spawn",    label: "Spawn" },
    { value: "config",   label: "Config" },
    { value: "budget",   label: "Budget" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Audit Log
          </h1>
          <span className="rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold bg-accent-soft text-accent border border-accent/15">
            {allEvents.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line bg-surface-strong text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-danger">Clear all local events?</span>
              <button
                onClick={() => { clear(); setConfirmClear(false); }}
                className="h-8 px-3 rounded-lg bg-danger text-white text-xs font-medium hover:bg-danger/80 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="h-8 px-3 rounded-lg border border-line text-xs text-foreground-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line bg-surface-strong text-xs text-foreground-muted hover:text-danger transition-colors"
            >
              <Trash2 size={13} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Filter size={12} />
          Filter:
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search actions, agents, resources..."
          className="h-8 rounded-md border border-line bg-surface-strong px-3 text-sm text-foreground focus:outline-none focus:border-accent/50 w-64"
        />
        <Combobox
          value={filterActor}
          onChange={(v) => setFilterActor(v as AuditActorType | "")}
          options={ACTOR_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
          placeholder="Filter actor"
        />
        <Combobox
          value={filterResource}
          onChange={(v) => setFilterResource(v as AuditResourceType | "")}
          options={RESOURCE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
          placeholder="Filter resource"
        />
        {(filterActor || filterResource || search) && (
          <button
            onClick={() => { setFilterActor(""); setFilterResource(""); setSearch(""); }}
            className="text-xs text-accent hover:text-accent-deep"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Events table */}
      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-foreground-muted">
              {allEvents.length === 0
                ? "No audit events yet. Actions will be tracked here."
                : "No events match the current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 text-left mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>Time</th>
                  <th className="px-4 py-2.5 text-left mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>Actor</th>
                  <th className="px-4 py-2.5 text-left mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>Action</th>
                  <th className="px-4 py-2.5 text-left mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>Resource</th>
                  <th className="px-4 py-2.5 text-left mono text-[0.65rem] uppercase text-foreground-muted" style={{ letterSpacing: "0.18em" }}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, 500).map((event) => (
                  <tr key={event.id} className="hover:bg-surface-strong transition-colors">
                    <td className="px-4 py-2.5 font-mono text-foreground-muted/70 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${ACTOR_COLORS[event.actorType]}`}>
                          {event.actorType}
                        </span>
                        <span className="text-foreground-soft truncate max-w-[100px]">{event.actorId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {event.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-medium ${RESOURCE_COLORS[event.resourceType]}`}>
                          {event.resourceType}
                        </span>
                        {event.resourceName && (
                          <span className="text-foreground-muted truncate max-w-[120px]">{event.resourceName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-foreground-muted truncate max-w-[200px]">
                      {event.details?.message as string ??
                        (event.details ? JSON.stringify(event.details).slice(0, 80) : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 500 && (
        <p className="text-xs text-foreground-muted text-center">
          Showing 500 of {filtered.length} events. Use export to get all records.
        </p>
      )}
    </div>
  );
}
