import Link from "next/link";
import { cn } from "@/lib/utils";
import { Mascot } from "@/components/shared/mascot";

type LogoLockupProps = {
  href?: string;
  className?: string;
  compact?: boolean;
};

export function LogoLockup({ href = "/", className, compact = false }: LogoLockupProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <Mascot size="sm" />
      {!compact ? (
        <span className="flex flex-col">
          <span className="text-[1rem] font-semibold tracking-[-0.03em] text-foreground">Rikuchan</span>
          <span className="text-[0.76rem] text-foreground-muted">AI Gateway</span>
        </span>
      ) : null}
    </Link>
  );
}
