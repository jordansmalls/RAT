import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SocialsForm } from "@/features/onboarding/components/socials-form";

export const metadata: Metadata = { title: "Add your social accounts" };

// The layout's <AuthGuard> renders this page only after the session check.
export const instant = false;

export default function AddSocialsPage() {
  return (
    <AuthCard
      eyebrow="Step 2 of 2"
      title="Add your social accounts"
      description="Enter your YouTube and Instagram accounts to collect audience counts. Twitter and Twitch are optional."
    >
      <SocialsForm />
    </AuthCard>
  );
}
