import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        "surface-panel rounded-[1.4rem] border border-line/90 p-6 text-sm text-foreground-soft sm:p-7",
        className,
      )}
    >
      {children}
    </div>
  );
}
