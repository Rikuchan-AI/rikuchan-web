export const clerkAppearance = {
  variables: {
    colorPrimary: "#34d399",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    colorBackground: "#18181b",
    colorInputBackground: "#27272a",
    colorInputText: "#fafafa",
    colorDanger: "#f87171",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    colorNeutral: "#fafafa",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-body)",
    fontSize: "0.875rem",
  },
  elements: {
    // --- Shared card styles ---
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "rounded-lg border border-line bg-surface shadow-none",
    headerTitle:
      "font-[var(--font-display)] text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground",
    headerSubtitle: "mt-1 text-sm leading-6 text-foreground-soft",

    // --- Sign-in / Sign-up forms ---
    socialButtonsBlockButton:
      "h-11 rounded-lg border border-line-strong bg-surface-strong text-foreground shadow-none hover:bg-surface-muted transition-colors",
    socialButtonsBlockButtonText: "text-sm font-medium text-foreground",
    socialButtonsBlockButtonArrow: "text-foreground-muted",
    dividerLine: "bg-line-strong",
    dividerText: "text-xs uppercase tracking-[0.14em] text-foreground-muted",
    formFieldLabel: "text-sm font-medium text-foreground",
    formFieldInput:
      "h-11 rounded-md border border-line-strong bg-surface-strong text-sm text-foreground shadow-none placeholder:text-foreground-muted focus:border-accent focus:ring-1 focus:ring-accent/30",
    formFieldHintText: "text-xs text-foreground-muted",
    formButtonPrimary:
      "h-11 rounded-lg bg-accent text-sm font-medium text-accent-foreground shadow-none hover:bg-accent-deep transition-colors",
    formButtonReset:
      "text-sm font-medium text-accent hover:text-accent-deep",
    footerActionText: "text-sm text-foreground-soft",
    footerActionLink: "font-semibold text-accent hover:text-accent-deep",
    identityPreviewText: "text-sm text-foreground-soft",
    identityPreviewEditButton: "font-semibold text-accent",
    formResendCodeLink: "font-semibold text-accent",
    alertText: "text-sm",
    alertTextContainer: "text-sm",
    formFieldSuccessText: "text-sm text-success",
    formFieldErrorText: "text-xs text-danger",
    otpCodeFieldInput:
      "h-11 w-11 rounded-md border border-line-strong bg-surface-strong text-foreground shadow-none",

    // --- UserButton popover ---
    userButtonPopoverCard:
      "rounded-lg border border-line bg-surface shadow-xl",
    userButtonPopoverActionButton:
      "rounded-md text-foreground-soft hover:bg-surface-strong transition-colors",
    userButtonPopoverActionButtonText: "text-sm text-foreground-soft",
    userButtonPopoverActionButtonIcon: "text-foreground-muted",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "text-sm font-semibold text-foreground",
    userPreviewSecondaryIdentifier: "text-xs text-foreground-muted",

    // --- UserProfile modal ---
    modalBackdrop: "bg-black/60 backdrop-blur-sm",
    modalContent:
      "rounded-xl border border-line bg-surface shadow-2xl",
    navbar: "bg-surface border-r border-line",
    navbarButton:
      "rounded-md text-sm text-foreground-soft hover:bg-surface-strong hover:text-foreground transition-colors",
    navbarButtonIcon: "text-foreground-muted",
    pageScrollBox: "bg-surface",
    page: "bg-surface",
    profileSection:
      "rounded-lg border border-line bg-surface-muted p-0",
    profileSectionTitle:
      "text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted",
    profileSectionTitleText:
      "text-xs font-semibold uppercase tracking-[0.14em] text-foreground-muted",
    profileSectionContent: "text-sm text-foreground-soft",
    profileSectionPrimaryButton:
      "rounded-md bg-surface-strong text-sm font-medium text-foreground hover:bg-surface-muted border border-line-strong transition-colors",
    accordionTriggerButton:
      "rounded-md text-sm text-foreground-soft hover:bg-surface-strong transition-colors",
    accordionContent: "bg-surface",
    formFieldAction:
      "text-sm font-medium text-accent hover:text-accent-deep",
    badge:
      "rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent border border-accent/25",
    tagInputContainer:
      "rounded-md border border-line-strong bg-surface-strong",
    tagPillContainer:
      "rounded-full bg-accent/15 text-xs text-accent border border-accent/25",

    // --- Organization profile ---
    organizationSwitcherTrigger:
      "rounded-lg border border-line bg-surface-strong text-sm text-foreground hover:bg-surface-muted transition-colors",
    organizationPreviewMainIdentifier:
      "text-sm font-semibold text-foreground",
    organizationPreviewSecondaryIdentifier:
      "text-xs text-foreground-muted",
    organizationSwitcherPopoverCard:
      "rounded-lg border border-line bg-surface shadow-xl",
    organizationSwitcherPopoverActionButton:
      "rounded-md text-foreground-soft hover:bg-surface-strong transition-colors",

    // --- Table elements (sessions, connected accounts) ---
    table: "text-sm",
    tableHead: "text-xs uppercase tracking-wider text-foreground-muted border-b border-line",
    tableCell: "text-sm text-foreground-soft border-b border-line/50",

    // --- Menu & action buttons ---
    menuButton:
      "rounded-md text-foreground-soft hover:bg-surface-strong transition-colors",
    menuList:
      "rounded-lg border border-line bg-surface shadow-xl",
    menuItem:
      "text-sm text-foreground-soft hover:bg-surface-strong transition-colors",

    // --- Breadcrumbs ---
    breadcrumbs: "text-sm",
    breadcrumbsItem: "text-foreground-muted",
    breadcrumbsItemDivider: "text-foreground-muted",

    // --- Avatar ---
    avatarBox: "ring-1 ring-line-strong",
    avatarImage: "rounded-full",

    // --- Buttons general ---
    buttonArrowIcon: "text-foreground-muted",
    providerIcon: "text-foreground-soft",
  },
} as const;

export function clerkIsConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}
