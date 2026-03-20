"use client";

type RikuLoaderSize = "sm" | "md" | "lg" | "xl";

const config: Record<RikuLoaderSize, { mascot: number; ring: number; stroke: number }> = {
  sm: { mascot: 32, ring: 52, stroke: 2 },
  md: { mascot: 48, ring: 76, stroke: 2.5 },
  lg: { mascot: 72, ring: 108, stroke: 3 },
  xl: { mascot: 96, ring: 144, stroke: 3.5 },
};

interface RikuLoaderProps {
  size?: RikuLoaderSize;
  message?: string;
}

export function RikuLoader({ size = "md", message }: RikuLoaderProps) {
  const { mascot, ring, stroke } = config[size];
  const center = ring / 2;
  const radius = center - stroke * 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: ring, height: ring }}>
        <svg
          width={ring}
          height={ring}
          className="absolute inset-0"
          style={{ animation: "riku-orbit 2s linear infinite" }}
        >
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="url(#riku-gradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${radius * Math.PI * 0.6} ${radius * Math.PI * 1.4}`}
          />
          <defs>
            <linearGradient id="riku-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)",
            animation: "riku-glow-pulse 2s ease-in-out infinite",
          }}
        />

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: "riku-float 2.5s ease-in-out infinite" }}
        >
          <svg width={mascot} height={mascot} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g style={{ transformOrigin: "12px 12px", animation: "riku-ear-left 2.5s ease-in-out infinite" }}>
              <polygon points="6,20 12,4 18,20" fill="#34d399" />
            </g>
            <g style={{ transformOrigin: "36px 12px", animation: "riku-ear-right 2.5s ease-in-out infinite 0.3s" }}>
              <polygon points="30,20 36,4 42,20" fill="#34d399" />
            </g>
            <rect x="8" y="18" width="32" height="24" rx="8" fill="#18181b" stroke="#27272a" strokeWidth="1" />
            <g style={{ transformOrigin: "19px 30px", animation: "riku-blink 3s ease-in-out infinite" }}>
              <circle cx="19" cy="30" r="4" fill="#34d399" />
              <circle cx="20" cy="29" r="1.5" fill="#09090b" />
            </g>
            <g style={{ transformOrigin: "29px 30px", animation: "riku-blink 3s ease-in-out infinite 0.1s" }}>
              <circle cx="29" cy="30" r="4" fill="#fbbf24" />
              <circle cx="30" cy="29" r="1.5" fill="#09090b" />
            </g>
            <path d="M22 36 L24 34 L26 36" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      </div>

      {message && (
        <p className={`${size === "xl" ? "text-sm" : "text-xs"} mono text-foreground-muted`} style={{ letterSpacing: "0.12em" }}>
          {message}
        </p>
      )}
    </div>
  );
}

export function RikuPageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-6">
      <RikuLoader size="xl" message={message} />
    </div>
  );
}

export function RikuInlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <RikuLoader size="sm" message={message} />
    </div>
  );
}
