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
        glow && "drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]",
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
      >
        {/* Ears */}
        <path
          d="M10 20L16 6L22 20"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(52, 211, 153, 0.08)"
        />
        <path
          d="M26 20L32 6L38 20"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(52, 211, 153, 0.08)"
        />
        {/* Head */}
        <rect
          x="8"
          y="18"
          width="32"
          height="24"
          rx="8"
          stroke="#34d399"
          strokeWidth="2"
          fill="rgba(52, 211, 153, 0.05)"
        />
        {/* Left eye */}
        <circle cx="18" cy="29" r="2.5" fill="#34d399" />
        {/* Right eye — warm glow */}
        <circle cx="30" cy="29" r="2.5" fill="#fbbf24" />
        {/* Nose */}
        <path
          d="M22.5 34L24 36L25.5 34"
          stroke="#a1a1aa"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
