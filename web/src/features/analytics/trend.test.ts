import { describe, expect, it } from "vitest";
import { trendDateLabel, trendTotals } from "./trend";

describe("click activity", () => {
  it("totals human and bot traffic independently without changing the buckets", () => {
    const rows = [
      { date: "2026-10-01T00:00:00.000Z", count: 5, botCount: 0 },
      { date: "2026-10-03T12:00:00.000Z", count: 0, botCount: 3 },
      { date: "2026-10-06T00:00:00.000Z", count: 8, botCount: 2 },
    ];
    expect(trendTotals(rows)).toEqual({ count: 13, botCount: 5 });
    expect(rows[1]).toEqual({ date: "2026-10-03T12:00:00.000Z", count: 0, botCount: 3 });
  });

  it("reports zero totals for an empty window", () => {
    expect(trendTotals([])).toEqual({ count: 0, botCount: 0 });
    expect(trendTotals(Array.from({ length: 12 }, () => ({ date: "", count: 0, botCount: 0 })))).toEqual({
      count: 0,
      botCount: 0,
    });
  });

  it("labels 24-hour buckets with UTC hours and longer windows with dates", () => {
    const date = "2026-10-01T23:30:00-04:00";
    expect(trendDateLabel(date, "24h")).toBe("03:30");
    expect(trendDateLabel(date, "7d")).toBe("Oct 2");
    expect(trendDateLabel(date, "30d")).toBe("Oct 2");
    expect(trendDateLabel(date, "30d", true)).toBe("Oct 2, 03:30");
  });
});
