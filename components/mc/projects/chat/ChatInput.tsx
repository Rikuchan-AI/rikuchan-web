"use client";

import { useRef, useState, useCallback } from "react";
import { Send, Paperclip, X } from "lucide-react";

interface AttachedFile {
  name: string;
  content: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the final message text (including file contents). Input is cleared by the parent. */
  onSend: (finalContent: string) => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
}

/**
 * Chat input with drag-and-drop file support.
 * Dropped files are read as text and appended to the message as fenced code blocks.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  sending = false,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const readAndAttach = useCallback((fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    let completed = 0;
    const results: AttachedFile[] = new Array(files.length);

    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        results[i] = { name: file.name, content: ev.target?.result as string ?? "" };
        completed += 1;
        if (completed === files.length) {
          setAttachedFiles((prev) => [...prev, ...results]);
        }
      };
      reader.onerror = () => {
        results[i] = { name: file.name, content: "" };
        completed += 1;
        if (completed === files.length) {
          setAttachedFiles((prev) => [...prev, ...results.filter((r) => r.content)]);
        }
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) readAndAttach(e.dataTransfer.files);
    },
    [readAndAttach],
  );

  const handleSend = useCallback(() => {
    if (disabled || sending) return;

    // Append attached files as fenced code blocks to the message
    let finalMessage = value.trim();
    for (const file of attachedFiles) {
      const ext = file.name.split(".").pop() ?? "";
      finalMessage += `\n\n\`\`\`${ext}\n// ${file.name}\n${file.content.trim()}\n\`\`\``;
    }

    if (!finalMessage) return;

    setAttachedFiles([]);
    onSend(finalMessage);
  }, [value, attachedFiles, disabled, sending, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasContent = value.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        dragging
          ? "border-accent/60 bg-accent/5"
          : "border-line bg-surface-strong"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
          {attachedFiles.map((file, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-foreground-soft"
            >
              <Paperclip size={10} className="text-foreground-muted shrink-0" />
              <span className="max-w-[140px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-foreground-muted/60 hover:text-danger transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Drag hint overlay */}
      {dragging && (
        <div className="px-3 pt-2.5 pb-1">
          <p className="text-xs text-accent text-center font-medium">Release to attach files</p>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-foreground-muted focus:outline-none min-h-[36px] max-h-[160px] leading-relaxed"
          placeholder={dragging ? "Drop files to attach..." : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
        />

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach files"
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-40"
        >
          <Paperclip size={14} />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasContent || sending || disabled}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-accent-foreground hover:bg-accent-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={13} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) readAndAttach(e.target.files); }}
      />
    </div>
  );
}
