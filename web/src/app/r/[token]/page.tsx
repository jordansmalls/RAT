import type { Metadata } from "next";
import { Suspense } from "react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { PublicReportPage } from "@/features/sponsor/components/public-report-page";

// Public sponsor report. No auth guard: anyone with the link can view it until the creator turns it off.
export const metadata: Metadata = {
  title: "Sponsor report",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SponsorReportPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <PublicReportPage />
    </Suspense>
  );
}
