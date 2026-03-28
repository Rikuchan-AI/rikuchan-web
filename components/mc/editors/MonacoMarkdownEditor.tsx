"use client";

import { useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-md border border-line bg-surface-strong min-h-[320px] flex items-center justify-center">
      <span className="text-xs text-foreground-muted">Loading editor...</span>
    </div>
  ),
});

interface MonacoMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  minHeight?: number;
}

export function MonacoMarkdownEditor({
  value,
  onChange,
  readOnly = false,
  minHeight = 320,
}: MonacoMarkdownEditorProps) {
  const editorRef = useRef<unknown>(null);

  const handleEditorDidMount = useCallback((editor: unknown) => {
    editorRef.current = editor;
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? "");
    },
    [onChange],
  );

  return (
    <div
      className="w-full rounded-md border border-line overflow-hidden"
      style={{ minHeight }}
    >
      <Editor
        height={`${minHeight}px`}
        defaultLanguage="markdown"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
