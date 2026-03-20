import Link from "next/link";
import { cn } from "@/lib/utils";
import { Mascot } from "@/components/shared/mascot";

type LogoLockupProps = {
  href?: string;
  className?: string;
  compact?: boolean;
  subtitle?: string;
};

export function LogoLockup({ href = "/", className, compact = false, subtitle = "AI Gateway" }: LogoLockupProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <Mascot size="sm" glow />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className="text-[1rem] font-semibold tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Rikuchan
          </span>
          <span
            className="text-foreground-muted"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.10em", textTransform: "uppercase" }}
          >
            {subtitle}
          </span>
        </span>
      )}
    </Link>
  );
}
