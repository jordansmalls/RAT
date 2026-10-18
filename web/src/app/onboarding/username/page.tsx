import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { UsernameForm } from "@/features/account/components/username-form";
import { SignOutButton } from "@/features/onboarding/components/sign-out-button";

export const metadata: Metadata = { title: "Choose a username" };

// The layout's <AuthGuard> renders this page only after the session check.
export const instant = false;

export default function ChooseUsernamePage() {
  return (
    <AuthCard
      eyebrow="Step 1 of 2"
      title="Choose your username"
      description="Pick a unique username for your account. You can change it later in settings."
    >
      <div className="flex flex-col gap-4">
        <UsernameForm currentUsername={null} submitLabel="Continue" autoFocus fullWidth />
        <SignOutButton />
      </div>
    </AuthCard>
  );
}
