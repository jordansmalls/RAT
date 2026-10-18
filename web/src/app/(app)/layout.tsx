import { Suspense } from "react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { AuthGuard } from "@/components/auth/auth-guard";
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <AuthGuard requirement="user">{children}</AuthGuard>
    </Suspense>
  );
}
