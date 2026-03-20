import { SignIn } from "@clerk/nextjs";
import { AuthConfigurationNotice } from "@/components/auth/auth-configuration-notice";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { clerkIsConfigured } from "@/lib/clerk";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthPageShell
      eyebrow="Welcome back"
      title="Login to your workspace"
      description="Continue to your operational dashboard for API access, billing, and workspace settings."
    >
      {clerkIsConfigured() ? (
        <SignIn />
      ) : (
        <AuthConfigurationNotice />
      )}
    </AuthPageShell>
  );
}
