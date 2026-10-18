import { Suspense } from "react";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { FullPageSpinner } from "@/components/full-page-spinner";
export const instant = false;
export default function Page() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DashboardView />
    </Suspense>
  );
}
