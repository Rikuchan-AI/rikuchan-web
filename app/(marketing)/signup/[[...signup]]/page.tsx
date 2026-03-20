import { SignUp } from "@clerk/nextjs";
import { AuthConfigurationNotice } from "@/components/auth/auth-configuration-notice";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { clerkIsConfigured } from "@/lib/clerk";

export const metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <AuthPageShell
      eyebrow="Create your account"
      title="Start with a cleaner AI layer"
      description="Create a workspace for better AI answers, trusted context, and clearer usage visibility."
    >
      {clerkIsConfigured() ? (
        <SignUp />
      ) : (
        <AuthConfigurationNotice />
      )}
    </AuthPageShell>
  );
}
