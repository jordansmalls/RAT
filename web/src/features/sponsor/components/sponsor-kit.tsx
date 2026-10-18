"use client";
import type { Campaign } from "@/features/dashboard/types";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import { DealPanel } from "./deal-panel";
import { SponsorInsights } from "./sponsor-insights";
import { SponsorReports } from "./sponsor-reports";

/** Everything a creator needs for a sponsorship conversation about one campaign. */
export function SponsorKit({ projectId, campaign }: { projectId: string; campaign?: Campaign }) {
  if (!campaign) {
    return (
      <p role="status" className={dashboard.helpText}>
        Loading campaign…
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <SponsorReports campaignId={campaign._id} campaignTitle={campaign.title} hasDeal={!!campaign.deal} />
      <DealPanel campaign={campaign} />
      <SponsorInsights projectId={projectId} campaignId={campaign._id} />
    </div>
  );
}
