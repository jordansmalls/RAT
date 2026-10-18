import { api, type Resource } from "@/lib/api";
import type { AnalyticsOverview, Click } from "@/features/dashboard/types";
/** One row of `recent-activity`: the old handler projects these fields and drops `_id`. */
export type RecentClick = Pick<Click, "geo" | "device" | "os" | "browser" | "clickedAt"> & { platform?: string | null };
import type { OverviewFilter, MetricName } from "./schemas";
export type Audience = {
  identifiedClicks: number;
  unidentifiedClicks: number;
  uniqueVisitors: number;
  repeatVisitors: number;
  repeatVisitorPercent: number;
  clicksPerVisitor: number;
  identityCoveragePercent: number;
};
export type Network = { totalClicks: number; uniqueVisitors: number; ratio: number; audience?: Audience };
export type Hero = { campaignId: string | null; title: string | null; clickCount: number };
export type Metrics = {
  "human-confidence": { confidence: number };
  "clicks-per-platform": { data: { platform: string; count: number }[] };
  "global-reach": { data: { country: string; count: number }[] };
  efficiency: { data: { platform: string; intent: number; audience?: Audience }[] };
  heatmap: { heatmap: { day: number; hour: number; clicks: number }[] };
  loyalty: { uniqueIPs: number; totalClicks: number; ratio: number } & Partial<Audience>;
  "device-breakdown": { mobile: number; tablet: number; desktop: number; total?: number };
  "recent-activity": { data: RecentClick[] };
  "platform-dominance": { data: { platform: string; share: number }[] };
  "network-effect": Network;
  velocity: { growth: number };
  "hero-campaign": Hero;
  "monthly-health": {
    networkEffect: Network;
    dominance: { platform: string; share: number }[];
    velocity: { growth: number };
    heroCampaign: Hero;
  };
};
export async function getAnalyticsOverview(query: OverviewFilter, signal?: AbortSignal) {
  return (await api.get<Resource<AnalyticsOverview>>("/api/v1/analytics/overview", { query, signal })).data;
}
export async function getMetric<K extends MetricName>(
  project: string,
  metric: K,
  linkId?: string,
  signal?: AbortSignal,
): Promise<Metrics[K]> {
  return (
    await api.get<Resource<Metrics[K]>>(`/api/v1/analytics/project/${encodeURIComponent(project)}/${metric}`, {
      query: { linkId },
      signal,
    })
  ).data;
}
export async function downloadClicks(project: string, format: "json" | "csv", linkId?: string) {
  return api.get<Blob>(`/api/v1/analytics/project/${encodeURIComponent(project)}/export`, {
    query: { format, linkId },
    responseType: "blob",
  });
}
