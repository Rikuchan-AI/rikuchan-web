import { cn } from "@/lib/utils";

type GradientHeadingProps = {
  as?: "h1" | "h2" | "h3";
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "accent";
};

export function GradientHeading({
  as: Tag = "h1",
  children,
  className,
  variant = "default",
}: GradientHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-semibold",
        variant === "default" ? "gradient-text" : "gradient-text-accent",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
