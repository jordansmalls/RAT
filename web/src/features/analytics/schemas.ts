import { z } from "zod";
export const rangeSchema = z.enum(["24h", "7d", "30d"]);
export const overviewFilterSchema = z.object({
  window: rangeSchema,
  projectId: z.string().optional(),
  campaignId: z.string().optional(),
  linkId: z.string().optional(),
});
export type OverviewFilter = z.infer<typeof overviewFilterSchema>;
export const metricNames = [
  "human-confidence",
  "clicks-per-platform",
  "global-reach",
  "efficiency",
  "heatmap",
  "loyalty",
  "device-breakdown",
  "recent-activity",
  "platform-dominance",
  "network-effect",
  "velocity",
  "hero-campaign",
  "monthly-health",
] as const;
export type MetricName = (typeof metricNames)[number];
