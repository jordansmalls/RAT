import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthShell } from "@/components/auth/auth-shell";

export default function GuestLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthShell>
      <AuthGuard requirement="guest">{children}</AuthGuard>
    </AuthShell>
  );
}
