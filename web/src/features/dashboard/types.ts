export interface Project {
  _id: string;
  clientName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDeal {
  amount: number;
  currency: string;
  category: string | null;
  paidAt: string | null;
}

export interface Campaign {
  linkCount?: number;
  deal?: CampaignDeal | null;
  _id: string;
  project: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  _id: string;
  project: string;
  campaign: string;
  title: string;
  platform: string;
  slug: string;
  destinationUrl: string;
  customUrl: string;
  isActive: boolean;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Click {
  _id: string;
  link: string;
  campaign: string;
  project: string;
  destinationUrl: string;
  clickedAt: string;
  dayOfWeek: number;
  hourOfDay: number;
  fullDateClicked: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
    ll?: { lat: number; lon: number };
    timezone?: string;
  };
  device: {
    type: string;
    vendor?: string;
    model?: string;
    cpu?: { architecture?: string };
  };
  os: { name?: string; version?: string };
  browser: {
    name?: string;
    version?: string;
    major?: string;
    engine?: { name?: string; version?: string };
  };
  referrer?: string;
  isBot: boolean;
}

export interface AnalyticsData {
  confidence?: number;
  data?: unknown[];
  heatmap?: unknown[];
  uniqueIPs?: number;
  totalClicks?: number;
  ratio?: number;
  mobile?: number;
  tablet?: number;
  desktop?: number;
  growth?: number;
  campaignId?: string;
  title?: string;
  clickCount?: number;
  networkEffect?: unknown;
  dominance?: unknown;
  velocity?: unknown;
  heroCampaign?: unknown;
}

export type PerformanceWindow = "24h" | "7d" | "30d";

export interface LinkPerformance {
  clicks: number;
  previousClicks: number;
  clicksPerHour: number;
  changePercent: number | null;
  sharePercent: number;
  velocityPercent: number;
  trend: number[];
}

export interface CampaignPerformance {
  window: PerformanceWindow;
  start: string;
  end: string;
  bucketMs: number;
  links: (Link & { performance: LinkPerformance })[];
}

export type AnalyticsBreakdown = { name: string; count: number };
export interface AnalyticsOverview {
  window: PerformanceWindow;
  start: string;
  end: string;
  summary: {
    clicks: number;
    previousClicks: number;
    botClicks: number;
    visitors: number;
    returningVisitors: number;
    identifiedClicks: number;
    projects: number;
    campaigns: number;
    links: number;
    activeLinks: number;
  };
  trend: { date: string; count: number; botCount: number }[];
  countries: AnalyticsBreakdown[];
  devices: AnalyticsBreakdown[];
  browsers: AnalyticsBreakdown[];
  sources: AnalyticsBreakdown[];
  platforms: AnalyticsBreakdown[];
  projects: (AnalyticsBreakdown & { id: string })[];
  campaigns: (AnalyticsBreakdown & { id: string })[];
  heatmap: { day: number; hour: number; count: number }[];
  recent: {
    _id: string;
    clickedAt: string;
    campaignTitle: string;
    country?: string;
    device?: string;
    browser?: string;
  }[];
}
