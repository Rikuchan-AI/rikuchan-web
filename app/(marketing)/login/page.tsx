import Link from "next/link";
import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <SectionShell tone="hero" className="pb-20">
      <Container>
        <div className="mx-auto max-w-[520px] rounded-[2rem] border border-line/80 bg-white/78 p-7 shadow-[0_20px_50px_rgba(16,34,29,0.08)] sm:p-10">
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Welcome back</p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.02] font-semibold text-foreground">Login to your workspace</h1>
          <p className="mt-5 text-[1rem] leading-8 text-foreground-soft">
            Continue to your operational dashboard for API access, billing, and workspace settings.
          </p>
          <div className="mt-8 grid gap-3">
            <Button variant="secondary" size="lg">
              Continue with Google
            </Button>
            <Button variant="secondary" size="lg">
              Continue with GitHub
            </Button>
          </div>
          <label className="mt-8 block text-sm font-medium text-foreground">
            Work email
            <input
              type="email"
              placeholder="you@company.com"
              className="mt-2 w-full rounded-[1rem] border border-line-strong bg-background-strong px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent"
            />
            <span className="mt-2 block text-xs text-foreground-soft">We can send a magic link if you prefer a passwordless login.</span>
          </label>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Button size="lg" className="w-full justify-center">
              Continue
            </Button>
            <Button variant="secondary" size="lg" className="w-full justify-center">
              Email me a sign-in link
            </Button>
          </div>
          <p className="mt-5 text-center text-sm text-foreground-soft">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-foreground">
              Create your account
            </Link>
          </p>
        </div>
      </Container>
    </SectionShell>
  );
}
