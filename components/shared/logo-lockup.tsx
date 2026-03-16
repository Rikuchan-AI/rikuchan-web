import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoLockupProps = {
  href?: string;
  className?: string;
  compact?: boolean;
};

export function LogoLockup({ href = "/", className, compact = false }: LogoLockupProps) {
  const mark = (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground text-background shadow-[0_10px_24px_rgba(16,34,29,0.14)]">
      <span className="absolute inset-2 rounded-xl border border-white/15" />
      <span className="text-sm font-semibold tracking-[-0.04em]">R</span>
    </span>
  );

  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      {mark}
      {!compact ? (
        <span className="flex flex-col">
          <span className="text-[1rem] font-semibold tracking-[-0.03em] text-foreground">Rikuchan</span>
          <span className="text-[0.76rem] text-foreground-soft">Trusted AI context layer</span>
        </span>
      ) : null}
    </Link>
  );
}
