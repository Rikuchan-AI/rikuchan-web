import Link from "next/link";
import { Lock } from "lucide-react";

export default function RestrictedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-500/10 border border-zinc-500/20">
          <Lock size={28} className="text-zinc-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Access restricted</h1>
        <p className="text-sm text-foreground-soft leading-relaxed">
          This section requires Admin permissions.
          Ask your organization administrator for access.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
