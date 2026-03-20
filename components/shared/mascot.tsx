import { cn } from "@/lib/utils";

type MascotProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  glow?: boolean;
};

const sizes = {
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-20 h-20",
};

export function Mascot({ size = "md", className, glow = false }: MascotProps) {
  const dim = size === "sm" ? 36 : size === "md" ? 48 : 80;

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center flex-shrink-0",
        sizes[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        width={dim}
        height={dim}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Rikuchan mascot"
        style={glow ? { filter: "drop-shadow(0 0 12px rgba(52,211,153,0.3))" } : undefined}
      >
        {/* Left ear */}
        <polygon points="6,20 12,4 18,20" fill="#34d399" />
        {/* Right ear */}
        <polygon points="30,20 36,4 42,20" fill="#34d399" />
        {/* Head */}
        <rect x="8" y="18" width="32" height="24" rx="8" fill="#18181b" stroke="#27272a" strokeWidth="1" />
        {/* Left eye — accent green */}
        <circle cx="19" cy="30" r="4" fill="#34d399" />
        <circle cx="20" cy="29" r="1.5" fill="#09090b" />
        {/* Right eye — warm amber */}
        <circle cx="29" cy="30" r="4" fill="#fbbf24" />
        <circle cx="30" cy="29" r="1.5" fill="#09090b" />
        {/* Nose — chevron */}
        <path d="M22 36 L24 34 L26 36" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  );
}
