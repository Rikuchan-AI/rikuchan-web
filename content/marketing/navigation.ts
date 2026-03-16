export const navigationLinks = [
  { label: "Product", href: "/product" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
] as const;

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Product overview", href: "/product" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Use cases", href: "/use-cases" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Trust & security", href: "/trust" },
      { label: "FAQ", href: "/faq" },
      { label: "Login", href: "/login" },
      { label: "Create free account", href: "/signup" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "API keys", href: "/dashboard/api-keys" },
      { label: "Billing", href: "/dashboard/billing" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
] as const;
