import { footerColumns } from "@/content/marketing/navigation";
import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { LogoLockup } from "@/components/shared/logo-lockup";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/55 py-12 sm:py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="max-w-[460px]">
            <LogoLockup />
            <p className="mt-6 text-sm leading-7 text-foreground-soft">
              Trusted context, smarter routing, and clearer usage visibility for AI used by people and agents.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/signup" size="lg">
                Create free account
              </Button>
              <Button href="/trust" variant="secondary" size="lg">
                Trust & security
              </Button>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} className="text-sm text-foreground-soft transition hover:text-foreground">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line/80 pt-6 text-xs text-foreground-soft sm:flex-row sm:items-center sm:justify-between">
          <p>Rikuchan</p>
          <div className="flex gap-5">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
