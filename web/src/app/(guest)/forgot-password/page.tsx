import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

// The layout's <AuthGuard> renders this page only after the session check.
export const instant = false;

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
