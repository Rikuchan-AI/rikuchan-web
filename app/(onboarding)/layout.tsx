import { auth } from "@clerk/nextjs/server";
import { LogoLockup } from "@/components/shared/logo-lockup";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-line bg-surface px-6 py-4">
        <LogoLockup href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {children}
        </div>
      </main>
    </div>
  );
}
