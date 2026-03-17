"use client";

import { ClerkLoaded, ClerkLoading, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigationLinks } from "@/content/marketing/navigation";
import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { LogoLockup } from "@/components/shared/logo-lockup";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { userId } = useAuth();

  const desktopAuth = (
    <ClerkLoaded>
      {userId ? (
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/dashboard"
            prefetch={false}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-transparent px-5 text-sm font-medium text-foreground transition hover:bg-surface-strong"
          >
            Dashboard
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-11 w-11 ring-1 ring-line-strong",
              },
            }}
          />
        </div>
      ) : (
        <div className="hidden items-center gap-3 lg:flex">
          <Button href="/login" variant="ghost">
            Login
          </Button>
          <Button href="/signup" size="lg">
            Create free account
          </Button>
        </div>
      )}
    </ClerkLoaded>
  );

  const mobileAuth = (
    <ClerkLoaded>
      {userId ? (
        <div className="mt-5 flex flex-col gap-3">
          <Button href="/dashboard" size="lg" className="justify-center" prefetch={false}>
            Go to dashboard
          </Button>
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
            <span className="text-sm font-medium text-foreground-soft">Signed in</span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10 ring-1 ring-line-strong",
                },
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <Button href="/signup" size="lg">
            Create free account
          </Button>
          <Button href="/login" variant="secondary" size="lg">
            Login
          </Button>
        </div>
      )}
    </ClerkLoaded>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/80 backdrop-blur-xl">
      <Container className="py-3">
        <div className="flex items-center justify-between">
          <LogoLockup />
          <nav className="hidden items-center gap-6 lg:flex">
            {navigationLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition hover:text-foreground",
                    active ? "text-foreground" : "text-foreground-soft",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {desktopAuth}
          <ClerkLoading>
            <div className="hidden h-11 w-[176px] rounded-lg bg-surface lg:block" />
          </ClerkLoading>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-transparent lg:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex flex-col gap-1.5">
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-5 bg-foreground" />
            </div>
          </button>
        </div>
        {open ? (
          <div className="mt-3 rounded-lg border border-line bg-surface p-5 lg:hidden">
            <div className="flex flex-col gap-2">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-sm font-medium text-foreground-soft transition hover:bg-surface-strong hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {mobileAuth}
          </div>
        ) : null}
      </Container>
    </header>
  );
}
