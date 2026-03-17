import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface p-5 text-sm text-foreground-soft sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
