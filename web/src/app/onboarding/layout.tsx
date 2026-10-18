import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthShell } from "@/components/auth/auth-shell";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <AuthShell>
      <AuthGuard requirement="onboarding">{children}</AuthGuard>
    </AuthShell>
  );
}
