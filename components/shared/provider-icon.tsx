type ProviderIconSize = "sm" | "md";

const sizes: Record<ProviderIconSize, number> = { sm: 16, md: 20 };

interface ProviderIconProps {
  provider: string;
  size?: ProviderIconSize;
  className?: string;
}

export function ProviderIcon({ provider, size = "md", className = "" }: ProviderIconProps) {
  const px = sizes[size];
  const id = provider.toLowerCase();

  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" className={className} aria-label={provider}>
      {id === "anthropic" && (
        <path d="M13.83 3L20 21h-3.78l-1.3-3.84H9.08L7.78 21H4L10.17 3h3.66zm-.83 11.16L11 8.4l-2 5.76h4z" fill="#d97757" />
      )}
      {id === "openai" && (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3a2.5 2.5 0 012.5 2.5c0 .53-.16 1.02-.44 1.42L12 12l-2.06-3.08A2.49 2.49 0 019.5 7.5 2.5 2.5 0 0112 5zm-4.5 6A2.5 2.5 0 0110 8.5c.53 0 1.02.16 1.42.44L12 12l-3.08 2.06A2.49 2.49 0 017.5 13.5 2.5 2.5 0 017.5 11zm4.5 8a2.5 2.5 0 01-2.5-2.5c0-.53.16-1.02.44-1.42L12 12l2.06 3.08c.28.4.44.89.44 1.42A2.5 2.5 0 0112 19zm4.5-6A2.5 2.5 0 0114 15.5c-.53 0-1.02-.16-1.42-.44L12 12l3.08-2.06c.4-.28.89-.44 1.42-.44a2.5 2.5 0 010 5z" fill="#10a37f" />
      )}
      {id === "google" && (
        <>
          <path d="M21.35 11.1H12v3.04h5.36c-.47 2.23-2.36 3.56-5.36 3.56-3.31 0-6-2.69-6-6s2.69-6 6-6c1.55 0 2.95.59 4.02 1.56l2.26-2.26C16.74 3.55 14.52 2.7 12 2.7 6.85 2.7 2.7 6.85 2.7 12S6.85 21.3 12 21.3c5.02 0 9.3-3.65 9.3-9.3 0-.72-.08-1.25-.19-1.8l.24-.1z" fill="#4285f4" />
        </>
      )}
      {id === "xai" && (
        <text x="12" y="16" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fafafa" fontFamily="var(--font-display)">X</text>
      )}
      {(id === "zai_general" || id === "zai") && (
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#6366f1" fontFamily="var(--font-display)">Z</text>
      )}
      {id === "deepseek" && (
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#4d6bfe" fontFamily="var(--font-display)">DS</text>
      )}
      {id === "mistral" && (
        <>
          <rect x="4" y="4" width="5" height="5" fill="#f7d046" />
          <rect x="10" y="4" width="5" height="5" fill="#f2a73b" />
          <rect x="15" y="4" width="5" height="5" fill="#ef8b2e" />
          <rect x="4" y="10" width="5" height="5" fill="#ee7623" />
          <rect x="10" y="10" width="5" height="5" fill="#000" />
          <rect x="15" y="10" width="5" height="5" fill="#ee7623" />
          <rect x="4" y="16" width="5" height="5" fill="#ee7623" />
          <rect x="10" y="16" width="5" height="5" fill="#f2a73b" />
          <rect x="15" y="16" width="5" height="5" fill="#f7d046" />
        </>
      )}
      {!["anthropic", "openai", "google", "xai", "zai_general", "zai", "deepseek", "mistral"].includes(id) && (
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="var(--foreground-muted)" fontFamily="var(--font-display)">
          {provider.charAt(0).toUpperCase()}
        </text>
      )}
    </svg>
  );
}
