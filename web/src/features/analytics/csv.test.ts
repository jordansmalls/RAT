import { describe, expect, it } from "vitest";
import { csvBlob, csvCell, linkCsvRows, overviewCsvRows } from "./csv";
import type { AnalyticsOverview, CampaignPerformance } from "@/features/dashboard/types";

const performance = { clicksPerHour: 0.5, changePercent: null, velocityPercent: 100, trend: [] };

describe("CSV exports", () => {
  it("quotes cells and neutralises spreadsheet formulas", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    for (const value of ["=SUM(A1)", "+1", "@cmd", "-2"]) expect(csvCell(value)).toBe(`"'${value}"`);
    expect(csvCell(12)).toBe('"12"');
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell("\t=1")).toBe(`"'\t=1"`);
    expect(csvCell("a-b")).toBe('"a-b"');
  });

  it("writes a BOM and CRLF rows", async () => {
    const blob = csvBlob([
      ["a", "b"],
      [1, 2],
    ]);
    expect(blob.type).toBe("text/csv;charset=utf-8");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('"a","b"\r\n"1","2"');
  });

  it("flattens the overview breakdowns in a fixed group order", () => {
    const row = (name: string, count: number) => ({ name, count });
    const data = {
      start: "2026-09-01T00:00:00.000Z",
      end: "2026-10-01T00:00:00.000Z",
      projects: [{ ...row("Launch", 4), id: "p1" }],
      campaigns: [{ ...row("Beta", 3), id: "c1" }],
      platforms: [row("youtube", 2)],
      countries: [row("US", 1)],
      devices: [],
      browsers: [row("Chrome", 9)],
      sources: [],
    } as unknown as AnalyticsOverview;
    const rows = overviewCsvRows(data);
    expect(rows[0]).toEqual(["From", "To", "Group", "Name", "Human clicks"]);
    expect(rows.slice(1).map((r) => r[2])).toEqual(["projects", "campaigns", "platforms", "countries"]);
    expect(rows[1]).toEqual([data.start, data.end, "projects", "Launch", 4]);
  });

  it("exports tracking links with platform labels, the API short URL and status", () => {
    const link = {
      _id: "l1",
      project: "p1",
      campaign: "c1",
      title: "Launch video",
      platform: "youtube",
      slug: "abcd",
      destinationUrl: "https://example.com",
      customUrl: "http://localhost:4000/abcd",
      isActive: false,
      clickCount: 7,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      performance: { ...performance, clicks: 12, previousClicks: 4, sharePercent: 60 },
    } satisfies CampaignPerformance["links"][number];
    const rows = linkCsvRows([link], "24h", { start: "s", end: "e" });
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual([
      "YouTube",
      "Launch video",
      "http://localhost:4000/abcd",
      "Paused",
      "24h",
      "s",
      "e",
      12,
      4,
      0.5,
      60,
    ]);
  });
});
