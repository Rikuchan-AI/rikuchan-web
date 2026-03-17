import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type IconBoxProps = {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "h-9 w-9 [&>svg]:w-4 [&>svg]:h-4",
  md: "h-11 w-11 [&>svg]:w-5 [&>svg]:h-5",
};

export function IconBox({ icon: Icon, className, size = "md" }: IconBoxProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-accent-soft text-accent",
        sizeClasses[size],
        className,
      )}
    >
      <Icon />
    </div>
  );
}
