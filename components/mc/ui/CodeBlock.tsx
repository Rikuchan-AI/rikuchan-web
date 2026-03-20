"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
}

export function CodeBlock({ code, language = "json", maxHeight = "200px" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-line bg-surface-muted overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line">
        <span
          className="mono text-xs uppercase text-foreground-muted"
          style={{ letterSpacing: "0.18em" }}
        >
          {language}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-foreground-soft hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-accent" />
              <span className="text-accent">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre
        className="mono text-xs text-foreground-soft p-4 overflow-auto"
        style={{ maxHeight }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
