import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "neutral";
};

const toneClasses = {
  accent: "bg-accent-soft text-accent border border-accent/15",
  neutral: "bg-surface-strong text-foreground-soft border border-line-strong",
};

export function Badge({ children, className, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.06em] uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
