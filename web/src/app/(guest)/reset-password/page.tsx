import type { Metadata } from "next";
import { Suspense } from "react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

// The layout's <AuthGuard> renders this page only after the session check.
export const instant = false;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
