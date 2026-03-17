import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthPageShell({ eyebrow, title, description, children }: AuthPageShellProps) {
  return (
    <SectionShell tone="hero" className="pb-20">
      <Container>
        <div className="mx-auto max-w-[1080px]">
          <div className="grid items-start gap-10 lg:grid-cols-[0.88fr_0.92fr] lg:gap-12">
            <div className="pt-4">
              <p className="mono text-xs uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
              <h1 className="mt-5 max-w-[12ch] text-[2.9rem] leading-[0.98] font-semibold text-foreground sm:text-[4rem]">
                {title}
              </h1>
              <p className="mt-6 max-w-[520px] text-[1rem] leading-8 text-foreground-soft sm:text-[1.05rem]">
                {description}
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Trusted identity for the public product and operational dashboard",
                  "Cleaner onboarding path for people using the product directly",
                  "JWT-ready auth flow aligned with the gateway's Clerk support",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-line bg-surface p-4 text-sm text-foreground-soft">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>{children}</div>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
