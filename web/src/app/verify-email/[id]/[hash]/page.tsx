import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { VerifyEmail } from "@/features/auth/components/verify-email";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={<FullPageSpinner />}>
        <VerifyEmail />
      </Suspense>
    </AuthShell>
  );
}
