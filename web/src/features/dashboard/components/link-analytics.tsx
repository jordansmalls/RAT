"use client";

import { useState } from "react";
import { ArrowLeft, Copy } from "@/components/icons";
import { useLinks } from "@/features/dashboard/queries";
import { ProjectMetrics } from "@/features/analytics/components/project-metrics";
import { AnalyticsView } from "./analytics-view";
import styles from "./dashboard.module.css";

export function LinkAnalytics({
  projectId,
  campaignId,
  slug,
  onBack,
}: {
  projectId: string;
  campaignId: string;
  slug: string;
  onBack: () => void;
}) {
  const query = useLinks(campaignId);
  const link = query.data?.find((item) => item.slug === slug);
  const result = query.isPending
    ? null
    : { link, error: query.isError ? "Could not load this link." : !link ? "Tracking link unavailable." : undefined };
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <div className={styles.linkAnalytics}>
      <button className={styles.textButton} onClick={onBack}>
        <ArrowLeft size={14} />
        Back to campaign
      </button>
      {result?.link ? (
        <>
          <div className={styles.contentHeading}>
            <div>
              <h2>{result.link.title}</h2>
              <p>{result.link.customUrl}</p>
            </div>
            <button
              className={styles.textButton}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.link!.customUrl);
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              <Copy size={14} />
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          {copyError && (
            <p role="alert" className={styles.errorText}>
              Could not copy the link.
            </p>
          )}
          <AnalyticsView projectId={projectId} campaignId={campaignId} linkId={result.link._id} />
          <ProjectMetrics projectId={projectId} linkId={result.link._id} />
        </>
      ) : result?.error ? (
        <p role="alert" className={styles.errorBanner}>
          {result.error}
          <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      ) : (
        <p role="status" className={styles.emptyState}>
          Loading link…
        </p>
      )}
    </div>
  );
}
