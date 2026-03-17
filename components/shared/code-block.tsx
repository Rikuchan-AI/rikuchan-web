import { cn } from "@/lib/utils";

type CodeBlockProps = {
  children: string;
  title?: string;
  className?: string;
};

export function CodeBlock({ children, title, className }: CodeBlockProps) {
  return (
    <div className={cn("rounded-lg border border-line bg-[#0a0a0a] overflow-hidden", className)}>
      {title ? (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="ml-2 text-xs text-foreground-muted mono">{title}</span>
        </div>
      ) : null}
      <pre className="p-4 overflow-x-auto">
        <code className="mono text-sm leading-6 text-foreground-soft">{children}</code>
      </pre>
    </div>
  );
}
