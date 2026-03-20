import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { IBM_Plex_Mono, Inter, Sora } from "next/font/google";
import { ToastProvider } from "@/components/shared/toast";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Rikuchan",
    template: "%s | Rikuchan",
  },
  description:
    "Trusted context, smarter routing, and clearer usage control for AI used by people and agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased bg-background`}>
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#34d399",
              colorBackground: "#18181b",
              colorInputBackground: "#27272a",
              colorText: "#fafafa",
              colorTextSecondary: "#a1a1aa",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-body)",
            },
          }}
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
