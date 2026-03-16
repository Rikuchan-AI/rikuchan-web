"use client";

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

  return (
    <header className="sticky top-0 z-50">
      <Container className="pt-5">
        <div className="surface-panel flex items-center justify-between rounded-full border border-white/60 px-4 py-3 sm:px-5">
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
          <div className="hidden items-center gap-3 lg:flex">
            <Button href="/login" variant="ghost">
              Login
            </Button>
            <Button href="/signup" size="lg">
              Create free account
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-white/70 lg:hidden"
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
          <div className="surface-panel mt-3 rounded-[1.6rem] border border-white/60 p-5 lg:hidden">
            <div className="flex flex-col gap-2">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-3 text-sm font-medium text-foreground-soft transition hover:bg-white/70 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <Button href="/signup" size="lg">
                Create free account
              </Button>
              <Button href="/login" variant="secondary" size="lg">
                Login
              </Button>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
