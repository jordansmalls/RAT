const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatNumber = (value: number | null | undefined) => (value == null ? "—" : numberFormat.format(value));

export const formatCompact = (value: number | null | undefined) => (value == null ? "—" : compactFormat.format(value));

export const formatPercent = (value: number | null | undefined) =>
  value == null ? "—" : `${numberFormat.format(value)}%`;

export const formatMultiple = (value: number | null | undefined) =>
  value == null ? "—" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}×`;

export function formatMoney(value: number | null | undefined, currency: string) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // Cents matter for cost per click; whole amounts read better for spend and savings.
    minimumFractionDigits: Math.abs(value) < 100 ? 2 : 0,
    maximumFractionDigits: Math.abs(value) < 100 ? 2 : 0,
  }).format(value);
}

export const formatDays = (value: number | null | undefined) =>
  value == null ? "—" : value === 0 ? "Same day" : `${value} ${value === 1 ? "day" : "days"}`;

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const regionNames =
  typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : undefined;

/** "US" → "United States". Unknown or invalid codes fall back to the raw value. */
export function countryName(code: string) {
  if (!code || code === "unknown") return "Unknown";
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export const tierLabels: Record<string, string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
  unknown: "Unknown",
};

export const gradeTone = (grade: string | null | undefined) =>
  grade === "A" ? "good" : grade === "B" ? "accent" : grade === "C" ? "warn" : grade === "D" ? "bad" : "muted";
