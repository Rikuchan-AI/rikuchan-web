export function AuthConfigurationNotice() {
  return (
    <div className="rounded-lg border border-danger/25 bg-danger-soft p-7 text-sm leading-7 text-foreground-soft sm:p-8">
      <p className="mono text-xs uppercase tracking-[0.18em] text-danger">Clerk is not configured yet</p>
      <h2 className="mt-4 text-[1.5rem] font-semibold text-foreground">Add Clerk environment keys to enable auth</h2>
      <p className="mt-4">
        Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in this app, then point Clerk webhooks at the gateway endpoint `/webhooks/clerk`.
      </p>
    </div>
  );
}
