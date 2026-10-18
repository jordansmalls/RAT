import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create an account" };

// The layout's <AuthGuard> renders this page only after the session check.
export const instant = false;

export default function RegisterPage() {
  return <RegisterForm />;
}
