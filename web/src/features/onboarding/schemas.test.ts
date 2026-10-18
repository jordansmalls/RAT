import { it, expect } from "vitest";
import { socialsSchema } from "./schemas";
import { projectSchema, campaignSchema, linkSchema } from "@/features/dashboard/schemas";
it("requires YouTube and Instagram, permits empty optional accounts and trims input", () => {
  expect(socialsSchema.parse({ youtube: " @jay ", instagram: " jay ", twitter: "", twitch: "" })).toEqual({
    youtube: "@jay",
    instagram: "jay",
    twitter: "",
    twitch: "",
  });
  expect(socialsSchema.safeParse({ youtube: "", instagram: "jay", twitter: "", twitch: "" }).success).toBe(false);
});
it("validates project names and descriptions, HTTP destinations and manual links", () => {
  expect(projectSchema.safeParse({ clientName: " ", description: "Test" }).success).toBe(false);
  for (const url of ["javascript:alert(1)", "ftp://example.com", "not a url"])
    expect(campaignSchema.safeParse({ project_id: "p1", title: "Launch", url }).success).toBe(false);
  expect(campaignSchema.safeParse({ project_id: "p1", title: "Launch", url: "https://example.com" }).success).toBe(
    true,
  );
  expect(linkSchema.safeParse({ project_id: "p1", campaign_id: "c1", title: " " }).success).toBe(false);
});
