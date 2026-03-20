"use client";

import { FileText, Code, Settings, Image, Database, File, ExternalLink, Download } from "lucide-react";
import type { DetectedFile } from "@/lib/mc/file-detection";
import { getFileIcon } from "@/lib/mc/file-detection";
import { getAgentFileViaGateway } from "@/lib/mc/agent-files";
import { toast } from "@/components/shared/toast";

const iconMap: Record<string, typeof FileText> = {
  doc: FileText,
  code: Code,
  config: Settings,
  image: Image,
  data: Database,
  file: File,
};

interface DetectedFilesSectionProps {
  files: DetectedFile[];
  agentId?: string;
}

export function DetectedFilesSection({ files, agentId }: DetectedFilesSectionProps) {
  if (files.length === 0) return null;

  const handleDownload = async (file: DetectedFile) => {
    // Try to read the file via the gateway
    if (agentId) {
      const result = await getAgentFileViaGateway(agentId, file.name);
      if (result.ok && result.content) {
        const blob = new Blob([result.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }

    // Fallback: copy path to clipboard
    await navigator.clipboard.writeText(file.path);
    toast("success", `Path copied: ${file.path}`);
  };

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="mono text-[0.6rem] uppercase text-foreground-muted mb-2" style={{ letterSpacing: "0.12em" }}>
        Referenced Files ({files.length})
      </p>
      <div className="space-y-1">
        {files.map((file) => {
          const type = getFileIcon(file.extension);
          const Icon = iconMap[type] ?? File;

          return (
            <div
              key={file.path}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-surface-strong transition-colors group"
            >
              <Icon size={13} className="text-foreground-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground font-medium truncate" title={file.path}>
                  {file.name}
                </p>
                <p className="mono text-[0.6rem] text-foreground-muted truncate" title={file.path}>
                  {file.path}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => navigator.clipboard.writeText(file.path).then(() => toast("success", "Path copied"))}
                  className="w-6 h-6 flex items-center justify-center rounded text-foreground-muted hover:text-foreground hover:bg-surface-strong transition-colors"
                  title="Copy path"
                >
                  <ExternalLink size={11} />
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="w-6 h-6 flex items-center justify-center rounded text-foreground-muted hover:text-accent hover:bg-accent-soft transition-colors"
                  title="Download file"
                >
                  <Download size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
