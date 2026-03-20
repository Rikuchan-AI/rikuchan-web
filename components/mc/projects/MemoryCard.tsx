"use client";

import {
  FileText,
  Landmark,
  ClipboardList,
  StickyNote,
  Link as LinkIcon,
  Paperclip,
} from "lucide-react";
import type { MemoryDocument, MemoryDocType, EmbeddingStatus } from "@/lib/mc/types-project";

/* ── Type icon mapping ─────────────────────────────────────────────────────── */

const typeIconMap: Record<MemoryDocType, React.ComponentType<{ size?: number; className?: string }>> = {
  file:     FileText,
  decision: Landmark,
  spec:     ClipboardList,
  note:     StickyNote,
  url:      LinkIcon,
};

/* ── Embedding status config ───────────────────────────────────────────────── */

const embeddingConfig: Record<EmbeddingStatus, { label: string; className: string; pulse?: boolean }> = {
  pending:    { label: "Pending",    className: "bg-surface-strong text-foreground-muted border border-line-strong" },
  processing: { label: "Indexing...", className: "bg-accent-soft text-accent border border-accent/15", pulse: true },
  embedded:  { label: "Indexed",    className: "bg-accent-soft text-accent border border-accent/15" },
  failed:    { label: "Failed",     className: "bg-danger-soft text-danger border border-danger/15" },
};

/* ── Component ─────────────────────────────────────────────────────────────── */

interface MemoryCardProps {
  doc: MemoryDocument;
}

export function MemoryCard({ doc }: MemoryCardProps) {
  const TypeIcon = typeIconMap[doc.type];
  const embedding = embeddingConfig[doc.embeddingStatus];
  const dateStr = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(doc.addedAt));

  return (
    <div className="rounded-lg border border-line bg-surface p-4 transition-all duration-200 hover:bg-surface-strong">
      {/* Header: type icon + title + embedding badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon size={14} className="text-foreground-muted shrink-0" />
          <h4 className="text-sm font-medium text-foreground leading-snug truncate">
            {doc.title}
          </h4>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em] ${embedding.className} ${
            embedding.pulse ? "animate-heartbeat" : ""
          }`}
        >
          {embedding.label}
        </span>
      </div>

      {/* Content preview */}
      {doc.content && (
        <p className="text-xs text-foreground-muted leading-snug line-clamp-3 mb-2.5">
          {doc.content}
        </p>
      )}

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {doc.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-strong border border-line-strong px-2 py-0.5 text-[0.6rem] text-foreground-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Attachments */}
      {doc.attachments && doc.attachments.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <Paperclip size={10} className="text-foreground-muted" />
          <div className="flex flex-wrap gap-1">
            {doc.attachments.map((att) => (
              <span
                key={att.id}
                className="rounded bg-surface-strong px-1.5 py-0.5 text-[0.55rem] text-foreground-muted font-mono truncate max-w-[140px]"
                title={att.path}
              >
                {att.label ?? att.path.split("/").pop()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <p className="mono text-xs text-foreground-muted">{dateStr}</p>
    </div>
  );
}
