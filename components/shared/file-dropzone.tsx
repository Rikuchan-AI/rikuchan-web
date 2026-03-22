"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Paperclip, X, Archive } from "lucide-react";
import JSZip from "jszip";
import type { RosterContextFile } from "@/lib/mc/types-project";

const ACCEPTED = ".md,.txt,.json,.yaml,.yml,.ts,.tsx,.js,.jsx,.py,.go,.rb,.sh,.toml,.csv,.env.example,.zip";

const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".jsx",
  ".py", ".go", ".rb", ".sh", ".toml", ".csv", ".xml", ".html", ".css",
  ".sql", ".env", ".cfg", ".ini", ".conf", ".log", ".rst", ".adoc",
]);

function isTextFile(name: string): boolean {
  const ext = name.lastIndexOf(".") >= 0 ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  return TEXT_EXTENSIONS.has(ext);
}

interface FileDropzoneProps {
  files: RosterContextFile[];
  onChange: (files: RosterContextFile[]) => void;
  id?: string;
}

export function FileDropzone({ files, onChange, id = "file-dropzone" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const addEntries = useCallback(
    (entries: RosterContextFile[]) => {
      onChange([...files, ...entries]);
    },
    [files, onChange],
  );

  const extractZip = useCallback(
    async (file: File) => {
      setExtracting(true);
      try {
        const zip = await JSZip.loadAsync(file);
        const entries: RosterContextFile[] = [];
        const now = Date.now();
        let idx = 0;

        for (const [zipPath, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          const fileName = zipPath.split("/").pop() ?? zipPath;
          if (!isTextFile(fileName)) continue;
          const content = await entry.async("text");
          entries.push({
            id: `zip-${now}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
            name: fileName,
            content,
            mimeType: "text/plain",
            addedAt: now,
          });
          idx++;
        }

        if (entries.length > 0) {
          addEntries(entries);
        }
      } catch {
        // ZIP extraction failed — ignore silently
      }
      setExtracting(false);
    },
    [addEntries],
  );

  const readFiles = useCallback(
    (fileList: FileList) => {
      const fileArray = Array.from(fileList);
      if (fileArray.length === 0) return;

      // Separate ZIP files from regular text files
      const zipFiles = fileArray.filter((f) => f.name.toLowerCase().endsWith(".zip"));
      const textFiles = fileArray.filter((f) => !f.name.toLowerCase().endsWith(".zip"));

      // Extract ZIPs
      for (const zf of zipFiles) {
        extractZip(zf);
      }

      // Read text files
      if (textFiles.length > 0) {
        const now = Date.now();
        let completed = 0;
        const newEntries: RosterContextFile[] = new Array(textFiles.length);

        textFiles.forEach((file, i) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            newEntries[i] = {
              id: `ctx-${now}-${i}-${Math.random().toString(16).slice(2, 6)}`,
              name: file.name,
              content: ev.target?.result as string,
              mimeType: file.type || "text/plain",
              addedAt: now,
            };
            completed += 1;
            if (completed === textFiles.length) {
              addEntries(newEntries);
            }
          };
          reader.readAsText(file);
        });
      }

      if (inputRef.current) inputRef.current.value = "";
    },
    [addEntries, extractZip],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) readFiles(e.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) readFiles(e.dataTransfer.files);
  };

  const remove = (fileId: string) => {
    onChange(files.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-2">
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-md border border-line bg-surface-strong px-3 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip size={11} className="text-foreground-muted shrink-0" />
                <span className="text-xs text-foreground truncate">{f.name}</span>
                <span className="text-[10px] text-foreground-muted shrink-0">
                  {(f.content.length / 1024).toFixed(1)}KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="ml-2 shrink-0 text-foreground-muted hover:text-danger transition-colors"
                aria-label={`Remove ${f.name}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
          dragging
            ? "border-accent/60 bg-accent/5"
            : "border-line hover:border-accent/40 hover:bg-surface-strong"
        }`}
      >
        <Upload size={16} className={dragging ? "text-accent" : "text-foreground-muted"} />
        <p className="text-xs text-foreground-muted text-center">
          <span className="text-foreground-soft font-medium">Click to browse</span>
          {" or drag & drop"}
        </p>
        <p className="text-[10px] text-foreground-muted/60">
          {extracting ? "Extracting ZIP..." : ".md · .txt · .json · .yaml · .ts · .py · .sh · .zip"}
        </p>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={ACCEPTED}
        onChange={handleInputChange}
        className="sr-only"
      />
    </div>
  );
}
