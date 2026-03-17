import { cn } from "@/lib/utils";

type SectionTone = "default" | "muted" | "highlight" | "cta" | "hero";

const toneClasses: Record<SectionTone, string> = {
  default: "",
  muted: "bg-surface-muted",
  highlight: "bg-surface-muted",
  cta: "",
  hero: "pt-24 sm:pt-28 lg:pt-32 hero-gradient",
};

type SectionShellProps = {
  id?: string;
  className?: string;
  tone?: SectionTone;
  children: React.ReactNode;
};

export function SectionShell({ id, className, tone = "default", children }: SectionShellProps) {
  return (
    <section id={id} className={cn("relative py-16 sm:py-20 lg:py-24", toneClasses[tone], className)}>
      {children}
    </section>
  );
}
