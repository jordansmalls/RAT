import { api, type Resource } from "@/lib/api";
import type { Campaign } from "@/features/dashboard/types";
import type { DealInput, ReportSections } from "./schemas";

/** Optional narrowing for project-scoped sponsor metrics. */
export type Scope = { campaignId?: string; linkId?: string };

export type GeoValue = {
  score: number;
  tier1Share: number;
  humanClicks: number;
  unknownClicks: number;
  tiers: { tier: string; weight: number; clicks: number; share: number }[];
  countries: { country: string; tier: string; weight: number; clicks: number; share: number }[];
  weights: Record<string, number>;
};

export type DecayLink = {
  link?: string;
  title: string | null;
  platform: string | null;
  publishedAt: string | null;
  humanClicks: number;
  halfLifeDays: number | null;
  shareAfterDay7: number;
};

export type DecayCurve = {
  humanClicks: number;
  days: number;
  curve: { day: number; clicks: number; cumulative: number; cumulativeShare: number }[];
  halfLifeDays: number | null;
  p90Days: number | null;
  peakDay: number | null;
  shareAfterDay7: number;
  shareAfterDay30: number;
  tailClicks: number;
  evergreen: boolean;
  links: DecayLink[];
};

export type TrafficBucketReason = "bot" | "unclassified" | "burst" | "duplicate" | "unidentified" | "verified";
export type TrafficGrade = "A" | "B" | "C" | "D";

export type TrafficQuality = {
  totalClicks: number;
  verifiedHumanClicks: number;
  verifiedShare: number;
  uniqueVerifiedVisitors: number;
  grade: TrafficGrade | null;
  buckets: {
    reason: TrafficBucketReason;
    label: string;
    clicks: number;
    share: number;
    filtered: boolean;
    description: string;
  }[];
  methodology: string[];
  period: { from: string; to: string } | null;
  generatedAt: string;
};

export type DealValue = {
  deal: { amount: number; currency: string; category: string | null };
  humanClicks: number;
  uniqueVisitors: number;
  effectiveCpc: number | null;
  costPerUniqueVisitor: number | null;
  benchmarks: {
    channel: string;
    label: string;
    cpc: number;
    equivalentSpend: number;
    savings: number;
    multiple: number | null;
  }[];
  bestComparison: { channel: string; multiple: number } | null;
  benchmarkSource: string;
  currencyNote: string;
};

export type ReportStatus = "active" | "revoked" | "expired";

export type SponsorReport = {
  _id: string;
  project: string;
  campaign: string;
  campaignTitle: string | null;
  title: string;
  sections: ReportSections;
  status: ReportStatus;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only returned on create and after regenerating the link. */
  token?: string;
  shareUrl?: string;
};

export type HeadlineStat = {
  key: string;
  label: string;
  value: number;
  unit: "count" | "percent" | "multiple";
  detail: string | null;
};

export type PublicReport = {
  report: {
    title: string;
    generatedAt: string;
    period: { from: string; to: string } | null;
    expiresAt: string | null;
    sections: string[];
    unavailableSections: string[];
  };
  creator: {
    displayName: string | null;
    handle: string | null;
    totalFollowers: number;
    socials: {
      platform: string;
      handle: string;
      displayName: string;
      followers: number | null;
      approximate: boolean;
      syncedAt: string | null;
    }[];
  };
  campaign: { title: string; url: string; createdAt: string | null };
  headline?: { summary: string; grade: TrafficGrade | null; stats: HeadlineStat[] };
  trafficQuality?: TrafficQuality;
  geo?: GeoValue;
  decay?: DecayCurve;
  dealValue?: DealValue;
  links?: {
    title: string;
    platform: string;
    url: string | null;
    publishedAt: string | null;
    humanClicks: number;
    share: number;
  }[];
  audience?: {
    humanClicks: number;
    days: number;
    topCountries: { country: string; clicks: number; share: number }[];
    devices: { type: string; clicks: number; share: number }[];
    clicksByDay: { date: string; clicks: number }[];
  };
};

export type ReportUpdate = Partial<{
  title: string;
  sections: Partial<ReportSections>;
  expires_at: string | null;
  revoked: boolean;
  regenerate_token: boolean;
}>;

const id = encodeURIComponent;

function projectMetric<T>(project: string, metric: string, query: Record<string, string | number | undefined>) {
  return async (signal?: AbortSignal) =>
    (await api.get<Resource<T>>(`/api/v1/analytics/project/${id(project)}/${metric}`, { query, signal })).data;
}

export function getGeoValue(project: string, scope: Scope, signal?: AbortSignal) {
  return projectMetric<GeoValue>(project, "geo-value", scope)(signal);
}

export function getDecayCurve(project: string, scope: Scope, days: number, signal?: AbortSignal) {
  return projectMetric<DecayCurve>(project, "decay", { ...scope, days })(signal);
}

export function getTrafficQuality(project: string, scope: Scope, signal?: AbortSignal) {
  return projectMetric<TrafficQuality>(project, "traffic-quality", scope)(signal);
}

export async function getDealValue(campaign: string, signal?: AbortSignal) {
  return (await api.get<Resource<DealValue>>(`/api/v1/analytics/campaign/${id(campaign)}/deal-value`, { signal })).data;
}

export async function saveDeal(campaign: string, body: DealInput) {
  return (await api.put<Resource<{ campaign: Campaign }>>(`/api/v1/campaigns/${id(campaign)}/deal`, body)).data
    .campaign;
}

export async function deleteDeal(campaign: string) {
  await api.delete(`/api/v1/campaigns/${id(campaign)}/deal`);
}

export async function getSponsorReports(campaign: string, signal?: AbortSignal) {
  return (
    await api.get<Resource<{ reports: SponsorReport[] }>>("/api/v1/sponsor-reports", {
      query: { campaign_id: campaign },
      signal,
    })
  ).data.reports;
}

export async function createSponsorReport(body: {
  campaign_id: string;
  title?: string;
  sections?: ReportSections;
  expires_at?: string | null;
}) {
  return (await api.post<Resource<{ report: SponsorReport }>>("/api/v1/sponsor-reports", body)).data.report;
}

export async function updateSponsorReport(report: string, body: ReportUpdate) {
  return (await api.patch<Resource<{ report: SponsorReport }>>(`/api/v1/sponsor-reports/${id(report)}`, body)).data
    .report;
}

export async function deleteSponsorReport(report: string) {
  await api.delete(`/api/v1/sponsor-reports/${id(report)}`);
}

/** The owner's preview of the public payload. Does not count as a view. */
export async function previewSponsorReport(report: string, signal?: AbortSignal) {
  return (
    await api.get<Resource<{ report: SponsorReport; payload: PublicReport }>>(`/api/v1/sponsor-reports/${id(report)}`, {
      query: { preview: 1 },
      signal,
    })
  ).data.payload;
}

export async function getPublicReport(token: string, signal?: AbortSignal) {
  return (await api.get<Resource<PublicReport>>(`/api/v1/public/reports/${id(token)}`, { signal })).data;
}
