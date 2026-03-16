import { Button } from "@/components/shared/button";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <SectionShell tone="hero" className="pb-20">
      <Container>
        <div className="mx-auto max-w-[560px] rounded-[2rem] border border-line/80 bg-white/78 p-7 shadow-[0_20px_50px_rgba(16,34,29,0.08)] sm:p-10">
          <p className="mono text-xs uppercase tracking-[0.18em] text-accent-deep/80">Create your account</p>
          <h1 className="mt-5 text-[2.7rem] leading-[1.02] font-semibold text-foreground">Start with a cleaner AI layer</h1>
          <p className="mt-5 text-[1rem] leading-8 text-foreground-soft">
            Create a workspace for better AI answers, trusted context, and clearer usage visibility.
          </p>
          <div className="mt-8 grid gap-3">
            <Button variant="secondary" size="lg">
              Continue with Google
            </Button>
            <Button variant="secondary" size="lg">
              Continue with GitHub
            </Button>
          </div>
          <div className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Work email
              <input
                type="email"
                placeholder="you@company.com"
                className="mt-2 w-full rounded-[1rem] border border-line-strong bg-background-strong px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent"
              />
              <span className="mt-2 block text-xs text-foreground-soft">
                We will use this to create your workspace and send a secure sign-in link.
              </span>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Workspace name
              <input
                type="text"
                placeholder="Rikuchan Starter"
                className="mt-2 w-full rounded-[1rem] border border-line-strong bg-background-strong px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent"
              />
              <span className="mt-2 block text-xs text-foreground-soft">Usually your name, team, or company.</span>
            </label>
          </div>
          <div className="mt-8">
            <Button size="lg" className="w-full justify-center">
              Create workspace
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-foreground-soft">No credit card to start. Setup stays lightweight.</p>
        </div>
      </Container>
    </SectionShell>
  );
}
