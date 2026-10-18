import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

// The layout's <AuthGuard> renders this page only after the session check.
export const instant = false;

export default function LoginPage() {
  return <LoginForm />;
}
