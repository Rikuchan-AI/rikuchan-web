import { cn } from "@/lib/utils";

type GlowCardProps = {
  className?: string;
  children: React.ReactNode;
  glowColor?: "accent" | "warm";
};

const glowClasses = {
  accent: "hover:shadow-[0_0_30px_rgba(52,211,153,0.08),0_0_0_1px_rgba(52,211,153,0.15)] hover:border-accent/25",
  warm: "hover:shadow-[0_0_30px_rgba(251,191,36,0.08),0_0_0_1px_rgba(251,191,36,0.15)] hover:border-warm/25",
};

export function GlowCard({ className, children, glowColor = "accent" }: GlowCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface p-5 text-sm text-foreground-soft transition-all duration-300 sm:p-6",
        glowClasses[glowColor],
        className,
      )}
    >
      {children}
    </div>
  );
}
