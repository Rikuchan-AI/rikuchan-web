import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-[660px]",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mono mb-4 text-[0.75rem] font-medium uppercase tracking-[0.18em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[2rem] leading-[1.04] font-semibold text-foreground sm:text-[2.5rem]">{title}</h2>
      <p className="mt-5 text-[1rem] leading-8 text-foreground-soft sm:text-[1.05rem]">{description}</p>
    </div>
  );
}
