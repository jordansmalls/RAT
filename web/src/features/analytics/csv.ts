import type { AnalyticsOverview, CampaignPerformance, PerformanceWindow } from "@/features/dashboard/types";
import { platformName } from "@/features/dashboard/platforms";

type Cell = string | number;

/**
 * Quote a CSV cell. Quoting alone does not stop a spreadsheet from treating a
 * cell as a formula, so text with a leading `= + @ -`, tab or CR is prefixed
 * with an apostrophe. Numbers are left alone so `-5` stays numeric.
 */
export function csvCell(value: Cell) {
  const text = typeof value === "number" ? String(value) : value.replace(/^[=+@\-\t\r]/, "'$&");
  return `"${text.replaceAll('"', '""')}"`;
}

/** A UTF-8 CSV blob with a BOM so Excel detects the encoding. */
export function csvBlob(rows: Cell[][]) {
  return new Blob(["﻿", rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
}

const overviewGroups = ["projects", "campaigns", "platforms", "countries", "devices"] as const;

/** Rows for the analytics overview export: one row per breakdown entry. */
export function overviewCsvRows(data: AnalyticsOverview): Cell[][] {
  return [
    ["From", "To", "Group", "Name", "Human clicks"],
    ...overviewGroups.flatMap((group) =>
      data[group].map((row): Cell[] => [data.start, data.end, group, row.name, row.count]),
    ),
  ];
}

/** Rows for a campaign's tracking-link export, in the order shown in the table. */
export function linkCsvRows(
  links: CampaignPerformance["links"],
  range: PerformanceWindow,
  period: Pick<CampaignPerformance, "start" | "end">,
): Cell[][] {
  return [
    [
      "Platform",
      "Title",
      "Short URL",
      "Status",
      "Period",
      "From",
      "To",
      "Human clicks",
      "Previous period clicks",
      "Clicks per hour",
      "Share %",
    ],
    ...links.map((link): Cell[] => [
      platformName(link.platform),
      link.title,
      link.customUrl,
      link.isActive ? "Active" : "Paused",
      range,
      period.start,
      period.end,
      link.performance.clicks,
      link.performance.previousClicks,
      link.performance.clicksPerHour,
      link.performance.sharePercent,
    ]),
  ];
}
