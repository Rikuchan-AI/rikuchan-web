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
    colorTextOnPrimaryBackground: "#09090b",
    colorShimmer: "#27272a",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-body)",
    fontSize: "0.875rem",
    spacingUnit: "1rem",
  },
  elements: {
    // --- Card containers (force dark on all surfaces) ---
    rootBox: "w-full",
    cardBox: "!w-full !shadow-none",
    card: "!rounded-lg !border !border-[#27272a] !bg-[#18181b] !shadow-none",
    header: "!text-left",
    headerTitle:
      "!text-[1.25rem] !font-semibold !tracking-[-0.03em] !text-[#fafafa]",
    headerSubtitle: "!text-sm !leading-6 !text-[#a1a1aa]",
    main: "!bg-[#18181b]",
    footer: "!bg-[#18181b] !border-t !border-[#27272a]",

    // --- Sign-in / Sign-up forms ---
    socialButtonsBlockButton:
      "!h-11 !rounded-lg !border !border-[#3f3f46] !bg-[#27272a] !text-[#fafafa] !shadow-none hover:!bg-[#18181b]",
    socialButtonsBlockButtonText: "!text-sm !font-medium !text-[#fafafa]",
    socialButtonsBlockButtonArrow: "!text-[#71717a]",
    dividerLine: "!bg-[#3f3f46]",
    dividerText: "!text-xs !uppercase !tracking-[0.14em] !text-[#71717a]",
    formFieldLabel: "!text-sm !font-medium !text-[#fafafa]",
    formFieldInput:
      "!h-11 !rounded-md !border !border-[#3f3f46] !bg-[#27272a] !text-sm !text-[#fafafa] !shadow-none placeholder:!text-[#71717a] focus:!border-[#34d399]",
    formFieldHintText: "!text-xs !text-[#71717a]",
    formButtonPrimary:
      "!h-11 !rounded-lg !bg-[#34d399] !text-sm !font-medium !text-[#09090b] !shadow-none hover:!bg-[#10b981]",
    formButtonReset: "!text-sm !font-medium !text-[#34d399] hover:!text-[#10b981]",
    footerActionText: "!text-sm !text-[#a1a1aa]",
    footerActionLink: "!font-semibold !text-[#34d399] hover:!text-[#10b981]",
    identityPreview: "!bg-[#27272a] !border !border-[#3f3f46] !rounded-lg",
    identityPreviewText: "!text-sm !text-[#a1a1aa]",
    identityPreviewEditButton: "!font-semibold !text-[#34d399]",
    formResendCodeLink: "!font-semibold !text-[#34d399]",
    alertText: "!text-sm",
    alertTextContainer: "!text-sm",
    formFieldSuccessText: "!text-sm !text-[#34d399]",
    formFieldErrorText: "!text-xs !text-[#f87171]",
    otpCodeFieldInput:
      "!h-11 !w-11 !rounded-md !border !border-[#3f3f46] !bg-[#27272a] !text-[#fafafa] !shadow-none",
    alternativeMethodsBlockButton:
      "!rounded-lg !border !border-[#3f3f46] !bg-[#27272a] !text-[#a1a1aa] hover:!bg-[#18181b]",

    // --- UserButton popover ---
    userButtonPopoverCard:
      "!rounded-lg !border !border-[#27272a] !bg-[#18181b] !shadow-xl",
    userButtonPopoverActionButton:
      "!rounded-md !text-[#a1a1aa] hover:!bg-[#27272a]",
    userButtonPopoverActionButtonText: "!text-sm !text-[#a1a1aa]",
    userButtonPopoverActionButtonIcon: "!text-[#71717a]",
    userButtonPopoverFooter: "!hidden",
    userPreview: "!bg-transparent",
    userPreviewMainIdentifier: "!text-sm !font-semibold !text-[#fafafa]",
    userPreviewSecondaryIdentifier: "!text-xs !text-[#71717a]",
    userPreviewAvatarBox: "!ring-1 !ring-[#3f3f46]",

    // --- UserProfile modal ---
    modalBackdrop: "!bg-black/60",
    modalContent: "!rounded-xl !border !border-[#27272a] !bg-[#18181b] !shadow-2xl",
    modalCloseButton: "!text-[#71717a] hover:!text-[#fafafa]",
    navbar: "!bg-[#18181b] !border-r !border-[#27272a]",
    navbarButton:
      "!rounded-md !text-sm !text-[#a1a1aa] hover:!bg-[#27272a] hover:!text-[#fafafa]",
    navbarButtonIcon: "!text-[#71717a]",
    navbarMobileMenuButton: "!text-[#a1a1aa]",
    pageScrollBox: "!bg-[#18181b]",
    page: "!bg-[#18181b]",
    profilePage: "!bg-[#18181b]",
    profileSection: "!border !border-[#27272a] !bg-[#0f0f12] !rounded-lg",
    profileSectionTitle: "!border-b !border-[#27272a]",
    profileSectionTitleText:
      "!text-xs !font-semibold !uppercase !tracking-[0.14em] !text-[#71717a]",
    profileSectionContent: "!text-sm !text-[#a1a1aa]",
    profileSectionPrimaryButton:
      "!rounded-md !bg-[#27272a] !text-sm !font-medium !text-[#fafafa] hover:!bg-[#3f3f46] !border !border-[#3f3f46]",
    profileSectionItem: "!border-b !border-[#27272a]/50",
    profileSectionItemList: "!bg-transparent",
    accordionTriggerButton:
      "!rounded-md !text-sm !text-[#a1a1aa] hover:!bg-[#27272a]",
    accordionContent: "!bg-[#18181b]",
    formFieldAction: "!text-sm !font-medium !text-[#34d399] hover:!text-[#10b981]",
    badge:
      "!rounded-full !bg-[rgba(52,211,153,0.15)] !px-2 !py-0.5 !text-[10px] !font-semibold !uppercase !tracking-wider !text-[#34d399] !border !border-[rgba(52,211,153,0.25)]",
    tagInputContainer: "!rounded-md !border !border-[#3f3f46] !bg-[#27272a]",
    tagPillContainer:
      "!rounded-full !bg-[rgba(52,211,153,0.15)] !text-xs !text-[#34d399] !border !border-[rgba(52,211,153,0.25)]",

    // --- Organization ---
    organizationSwitcherTrigger:
      "!rounded-lg !border !border-[#27272a] !bg-[#27272a] !text-sm !text-[#fafafa] hover:!bg-[#18181b]",
    organizationPreviewMainIdentifier: "!text-sm !font-semibold !text-[#fafafa]",
    organizationPreviewSecondaryIdentifier: "!text-xs !text-[#71717a]",
    organizationSwitcherPopoverCard:
      "!rounded-lg !border !border-[#27272a] !bg-[#18181b] !shadow-xl",
    organizationSwitcherPopoverActionButton:
      "!rounded-md !text-[#a1a1aa] hover:!bg-[#27272a]",

    // --- Tables ---
    table: "!text-sm",
    tableHead: "!text-xs !uppercase !tracking-wider !text-[#71717a] !border-b !border-[#27272a]",
    tableCell: "!text-sm !text-[#a1a1aa] !border-b !border-[#27272a]/50",

    // --- Menus ---
    menuButton: "!rounded-md !text-[#a1a1aa] hover:!bg-[#27272a]",
    menuList: "!rounded-lg !border !border-[#27272a] !bg-[#18181b] !shadow-xl",
    menuItem: "!text-sm !text-[#a1a1aa] hover:!bg-[#27272a]",

    // --- Avatar ---
    avatarBox: "!ring-1 !ring-[#3f3f46]",
    avatarImage: "!rounded-full",

    // --- Misc ---
    buttonArrowIcon: "!text-[#71717a]",
    providerIcon: "!text-[#a1a1aa]",
    selectButton: "!bg-[#27272a] !border !border-[#3f3f46] !text-[#fafafa]",
    selectOptionsContainer: "!bg-[#18181b] !border !border-[#27272a]",
    selectOption: "!text-[#a1a1aa] hover:!bg-[#27272a]",
  },
} as const;

export function clerkIsConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}
