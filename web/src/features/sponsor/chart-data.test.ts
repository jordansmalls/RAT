import { describe, expect, it } from "vitest";
import type { DealValue } from "./api";
import { bestSavingChannel, decayTicks, summaryHighlight } from "./chart-data";

function benchmark(channel: string, savings: number): DealValue["benchmarks"][number] {
  return { channel, label: channel, savings, cpc: 1, equivalentSpend: 100, multiple: 2 };
}

describe("sponsor chart and emphasis data", () => {
  it("picks the largest positive saving without reordering channels", () => {
    const rows = [benchmark("Meta", 100), benchmark("Search", 800), benchmark("TikTok", -50)];
    expect(bestSavingChannel(rows)?.channel).toBe("Search");
    expect(rows.map((row) => row.channel)).toEqual(["Meta", "Search", "TikTok"]);
  });

  it("never highlights a losing or break-even comparison", () => {
    expect(bestSavingChannel([benchmark("Meta", -20), benchmark("Search", 0)])).toBeUndefined();
    expect(bestSavingChannel([])).toBeUndefined();
  });

  it("uses the first comparison to break equal savings ties", () => {
    expect(bestSavingChannel([benchmark("Meta", 10), benchmark("Search", 10)])?.channel).toBe("Meta");
  });

  it("handles empty and single-day curves", () => {
    expect(decayTicks([])).toEqual([]);
    expect(decayTicks([0])).toEqual([0]);
  });

  it("keeps milestones readable on short and long curves", () => {
    expect(decayTicks(Array.from({ length: 8 }, (_, day) => day))).toEqual([0, 7]);
    expect(decayTicks(Array.from({ length: 31 }, (_, day) => day))).toEqual([0, 7, 30]);
    expect(decayTicks(Array.from({ length: 90 }, (_, day) => day))).toEqual([0, 30, 89]);
    expect(decayTicks(Array.from({ length: 365 }, (_, day) => day))).toEqual([0, 364]);
  });

  it("only labels milestones present in sparse data", () => {
    expect(decayTicks([0, 14, 60])).toEqual([0, 60]);
  });

  it("emphasizes verified traffic without changing the summary text", () => {
    const summary = "1,240 verified human clicks, 92.4% verified traffic (grade A), 40% tier-1 audience.";
    const result = summaryHighlight(summary);
    expect(result.phrase).toBe("92.4% verified traffic");
    expect(result.before + result.phrase + result.after).toBe(summary);
  });

  it("falls back to the click count, including its thousands separators", () => {
    expect(summaryHighlight("1,240 verified human clicks.").phrase).toBe("1,240 verified human clicks");
    expect(summaryHighlight("1 human click.").phrase).toBe("1 human click");
  });

  it("leaves summaries without a known key phrase intact", () => {
    expect(summaryHighlight("No traffic yet.")).toEqual({ before: "No traffic yet.", phrase: "", after: "" });
  });
});
