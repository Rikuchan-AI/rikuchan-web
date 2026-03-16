import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "neutral";
};

const toneClasses = {
  accent: "bg-accent-soft text-accent-deep border border-accent/15",
  neutral: "bg-white/70 text-foreground-soft border border-line/80",
};

export function Badge({ children, className, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold tracking-[0.06em] uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
