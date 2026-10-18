"use client";
import { useParams } from "next/navigation";
import { FullPageSpinner } from "@/components/full-page-spinner";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import { isApiError } from "@/lib/api";
import { usePublicReport } from "../queries";
import { PublicReportView } from "./public-report-view";
import styles from "./sponsor.module.css";

/** Public, unauthenticated report at `/r/[token]`. */
export function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const report = usePublicReport(token);

  return (
    <div className={`${dashboard.theme} ${styles.page}`}>
      <main className={styles.pageInner}>
        {report.data ? (
          <PublicReportView data={report.data} />
        ) : report.isError ? (
          <div className={dashboard.emptyState}>
            <h2>
              {isApiError(report.error) && report.error.status === 404 ? "Report not found" : "Something went wrong"}
            </h2>
            <p>
              {isApiError(report.error) && report.error.status === 404
                ? "This link is invalid, has expired or was turned off by the creator. Ask them for a new link."
                : "We couldn't load this report. Please try again."}
            </p>
            {!(isApiError(report.error) && report.error.status === 404) && (
              <button className={`${dashboard.textButton} mt-4`} onClick={() => void report.refetch()}>
                Try again
              </button>
            )}
          </div>
        ) : (
          <FullPageSpinner />
        )}
      </main>
    </div>
  );
}
