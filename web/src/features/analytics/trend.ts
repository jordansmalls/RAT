import type { AnalyticsOverview, PerformanceWindow } from "@/features/dashboard/types";

export function trendTotals(rows: AnalyticsOverview["trend"]) {
  return rows.reduce((totals, row) => ({ count: totals.count + row.count, botCount: totals.botCount + row.botCount }), {
    count: 0,
    botCount: 0,
  });
}

export function trendDateLabel(date: string, window: PerformanceWindow, detailed = false) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "UTC",
    ...(window === "24h" && !detailed ? {} : { month: "short", day: "numeric" }),
    ...(window === "24h" || detailed ? { hour: "numeric", minute: "2-digit", hour12: false } : {}),
  });
}
