export const clerkAppearance = {
  variables: {
    colorPrimary: "#34d399",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    colorBackground: "#18181b",
    colorInputBackground: "#27272a",
    colorInputText: "#fafafa",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-body)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "rounded-lg border border-line bg-surface shadow-none",
    headerTitle: "font-[var(--font-display)] text-[2rem] font-semibold tracking-[-0.03em] text-foreground",
    headerSubtitle: "mt-2 text-sm leading-6 text-foreground-soft",
    socialButtonsBlockButton:
      "h-12 rounded-lg border border-line-strong bg-surface-strong text-foreground shadow-none hover:bg-surface",
    socialButtonsBlockButtonText: "text-sm font-medium text-foreground",
    dividerLine: "bg-line-strong",
    dividerText: "text-xs uppercase tracking-[0.14em] text-foreground-muted",
    formFieldLabel: "text-sm font-medium text-foreground",
    formFieldInput:
      "h-12 rounded-md border border-line-strong bg-surface-strong text-sm text-foreground shadow-none focus:border-accent",
    formButtonPrimary:
      "h-12 rounded-lg bg-accent text-sm font-medium text-accent-foreground shadow-none hover:bg-accent-deep",
    footerActionText: "text-sm text-foreground-soft",
    footerActionLink: "font-semibold text-accent",
    identityPreviewText: "text-sm text-foreground-soft",
    identityPreviewEditButton: "font-semibold text-accent",
    formResendCodeLink: "font-semibold text-accent",
    alertText: "text-sm",
    formFieldSuccessText: "text-sm",
    otpCodeFieldInput:
      "h-12 w-11 rounded-md border border-line-strong bg-surface-strong text-foreground shadow-none",
  },
} as const;

export function clerkIsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}
