"use client";

import { useRef, useState, useEffect } from "react";
import { PauseCircle, PlayCircle, Trash2, Download } from "lucide-react";
import { Combobox } from "@/components/mc/ui/Combobox";
import { useGatewayStore } from "@/lib/mc/gateway-store";
import type { LogLevel } from "@/lib/mc/types";
import { formatTimestamp } from "@/lib/mc/mc-utils";

const levelColors: Record<LogLevel, string> = {
  INFO:  "text-foreground-soft",
  DEBUG: "text-foreground-muted",
  WARN:  "text-warning",
  ERROR: "text-danger",
};

const levelBg: Record<LogLevel, string> = {
  INFO:  "",
  DEBUG: "",
  WARN:  "bg-warm-soft",
  ERROR: "bg-danger-soft",
};

export function GatewayLogs() {
  const logs = useGatewayStore((s) => s.logs);
  const clearLogs = useGatewayStore((s) => s.clearLogs);

  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "ALL">("ALL");
  const [filterAgent, setFilterAgent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const agents = useGatewayStore((s) => s.agents);
  const agentOptions = [{ id: "ALL", name: "ALL" }, ...agents.map((a) => ({ id: a.id, name: a.name }))];

  const filtered = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false;
    if (filterAgent && filterAgent !== "ALL" && log.agentId !== filterAgent) return false;
    return true;
  });

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const exportLogs = () => {
    const text = filtered
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level}]${l.agentId ? ` [${l.agentId}]` : ""} ${l.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gateway-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-line bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-muted">
        <div className="flex items-center gap-2">
          {/* Level filter */}
          <Combobox
            value={filterLevel}
            onChange={(v) => setFilterLevel(v as LogLevel | "ALL")}
            options={[
              { id: "ALL", label: "All Levels" },
              { id: "INFO", label: "INFO" },
              { id: "WARN", label: "WARN" },
              { id: "ERROR", label: "ERROR" },
              { id: "DEBUG", label: "DEBUG" },
            ]}
            placeholder="Filter level"
          />

          {/* Agent filter */}
          <Combobox
            value={filterAgent || "ALL"}
            onChange={(v) => setFilterAgent(v === "ALL" ? "" : v)}
            options={agentOptions.map(({ id, name }) => ({ id, label: name }))}
            placeholder="Filter agent"
          />

          <span className="mono text-xs text-foreground-muted">{filtered.length} entries</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
            title={autoScroll ? "Pausar scroll" : "Retomar scroll"}
          >
            {autoScroll ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-foreground-soft hover:text-foreground hover:bg-surface-strong transition-colors"
            title="Export logs"
          >
            <Download size={12} />
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-foreground-soft hover:text-danger hover:bg-danger-soft transition-colors"
            title="Clear logs"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filtered.length === 0 ? (
          <p className="text-center text-foreground-muted py-12">No log entries</p>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-4 py-1.5 border-b border-line/30 hover:bg-surface-strong/40 transition-colors ${levelBg[log.level]}`}
            >
              <span className="text-foreground-muted flex-shrink-0 mt-0.5">
                {formatTimestamp(log.timestamp)}
              </span>
              <span
                className={`font-semibold flex-shrink-0 w-10 uppercase ${levelColors[log.level]}`}
                style={{ fontSize: "0.65rem", letterSpacing: "0.1em" }}
              >
                {log.level}
              </span>
              {log.agentId && (
                <span className="text-foreground-muted flex-shrink-0 truncate max-w-[100px]">
                  [{log.agentId}]
                </span>
              )}
              <span className="text-foreground-soft flex-1 min-w-0 break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
