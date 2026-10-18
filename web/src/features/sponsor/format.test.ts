import { describe, expect, it } from "vitest";
import { countryName, formatDays, formatMoney, formatMultiple, formatPercent, gradeTone } from "./format";

describe("sponsor formatters", () => {
  it("formats money in the deal currency", () => {
    expect(formatMoney(0.61, "USD")).toBe("$0.61");
    expect(formatMoney(2500, "EUR")).toBe("€2,500");
    expect(formatMoney(null, "USD")).toBe("—");
  });

  it("formats percents, multiples and days", () => {
    expect(formatPercent(38.14)).toBe("38.1%");
    expect(formatMultiple(2.824)).toBe("2.82×");
    expect(formatDays(0)).toBe("Same day");
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(12)).toBe("12 days");
    expect(formatDays(null)).toBe("—");
  });

  it("names countries and falls back for unknown codes", () => {
    expect(countryName("US")).toBe("United States");
    expect(countryName("unknown")).toBe("Unknown");
    expect(countryName("")).toBe("Unknown");
  });

  it("maps grades to tones", () => {
    expect(gradeTone("A")).toBe("good");
    expect(gradeTone("D")).toBe("bad");
    expect(gradeTone(null)).toBe("muted");
  });
});
