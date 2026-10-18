import { z } from "zod";

/** Keep in sync with `api/config/sponsor.php` (`deal_value`) and `CampaignDealRequest`. */
export const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export const dealCategories = ["default", "saas", "finance", "ecommerce", "gaming", "education", "health"] as const;

export const categoryLabels: Record<(typeof dealCategories)[number], string> = {
  default: "General",
  saas: "Software / SaaS",
  finance: "Finance",
  ecommerce: "E-commerce",
  gaming: "Gaming",
  education: "Education",
  health: "Health",
};

export const dealFormSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Enter what the sponsor paid.")
    .refine((value) => Number(value) > 0, "Enter an amount greater than 0.")
    .refine((value) => Number(value) <= 10_000_000, "Enter an amount up to 10,000,000."),
  currency: z.enum(currencies),
  category: z.enum(dealCategories),
  paid_at: z.string(),
});
export type DealFormValues = z.infer<typeof dealFormSchema>;

export type DealInput = {
  amount: number;
  currency: (typeof currencies)[number];
  category: (typeof dealCategories)[number] | null;
  paid_at: string | null;
};

export function toDealInput(values: DealFormValues): DealInput {
  return {
    amount: Number(values.amount),
    currency: values.currency,
    category: values.category === "default" ? null : values.category,
    paid_at: values.paid_at || null,
  };
}

/** Keep in sync with `SponsorReport::DEFAULT_SECTIONS`. */
export const reportSectionKeys = [
  "headline",
  "trafficQuality",
  "geo",
  "decay",
  "dealValue",
  "links",
  "audience",
] as const;
export type ReportSectionKey = (typeof reportSectionKeys)[number];
export type ReportSections = Record<ReportSectionKey, boolean>;

export const reportSectionLabels: Record<ReportSectionKey, string> = {
  headline: "Headline stats",
  trafficQuality: "Traffic quality certificate",
  geo: "Geo value",
  decay: "Click decay and long tail",
  dealValue: "Deal value and cost per click",
  links: "Tracking links",
  audience: "Audience breakdown",
};

export const defaultReportSections: ReportSections = {
  headline: true,
  trafficQuality: true,
  geo: true,
  decay: true,
  dealValue: false,
  links: true,
  audience: true,
};

export const decayDayOptions = [30, 90, 180, 365] as const;
