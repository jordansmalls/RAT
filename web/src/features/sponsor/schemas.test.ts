import { describe, expect, it } from "vitest";
import { dealFormSchema, defaultReportSections, reportSectionKeys, toDealInput } from "./schemas";

const valid = { amount: "2500", currency: "USD", category: "saas", paid_at: "" } as const;

describe("dealFormSchema", () => {
  it("accepts a positive amount", () => {
    expect(dealFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["", "0", "-5", "abc", "10000001"])("rejects amount %j", (amount) => {
    expect(dealFormSchema.safeParse({ ...valid, amount }).success).toBe(false);
  });

  it("rejects unsupported currencies", () => {
    expect(dealFormSchema.safeParse({ ...valid, currency: "JPY" }).success).toBe(false);
  });
});

describe("toDealInput", () => {
  it("converts the form into the API body", () => {
    expect(toDealInput({ ...valid, paid_at: "2026-10-01" })).toEqual({
      amount: 2500,
      currency: "USD",
      category: "saas",
      paid_at: "2026-10-01",
    });
  });

  it("sends the default category and an empty date as null", () => {
    expect(toDealInput({ ...valid, category: "default" })).toMatchObject({ category: null, paid_at: null });
  });
});

describe("report sections", () => {
  it("defaults every section on except the deal price", () => {
    expect(Object.keys(defaultReportSections)).toEqual([...reportSectionKeys]);
    expect(Object.entries(defaultReportSections).filter(([, on]) => !on)).toEqual([["dealValue", false]]);
  });
});
