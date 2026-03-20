"use client";

interface LivePulseProps {
  color?: string;
  size?: number;
  className?: string;
}

export function LivePulse({
  color = "var(--status-online)",
  size = 8,
  className = "",
}: LivePulseProps) {
  return (
    <span
      className={`relative inline-flex ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full animate-live-pulse"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
}
