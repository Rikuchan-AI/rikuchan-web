import { cn } from "@/lib/utils";

type AppPreviewFrameProps = {
  className?: string;
  children: React.ReactNode;
};

export function AppPreviewFrame({ className, children }: AppPreviewFrameProps) {
  return (
    <div
      className={cn(
        "surface-strong relative overflow-hidden rounded-[2rem] border border-white/70 p-4 shadow-[0_28px_70px_rgba(16,34,29,0.16)] sm:p-5",
        className,
      )}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff8477]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f6c76f]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#7cd3a4]" />
      </div>
      {children}
    </div>
  );
}
