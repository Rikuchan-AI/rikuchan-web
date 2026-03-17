import { cn } from "@/lib/utils";

type AppPreviewFrameProps = {
  className?: string;
  children: React.ReactNode;
};

export function AppPreviewFrame({ className, children }: AppPreviewFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-line bg-[#0a0a0a] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
      </div>
      {children}
    </div>
  );
}
