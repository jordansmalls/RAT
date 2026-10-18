import { describe, it, expect } from "vitest";
import { dashboardCampaigns, campaignGroups, filterCampaigns, dashboardHref } from "./dashboard";
import type { Project, Campaign } from "./types";
const project = (id: string, name: string): Project => ({
  _id: id,
  clientName: name,
  description: "Test",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
});
const projects = [project("p1", "Launch"), project("p2", "Launch"), project("p3", "Empty")];
const campaign = (id: string, p: string, title: string, linkCount: number, hour: string): Campaign => ({
  _id: id,
  project: p,
  title,
  url: `https://example.com/${title.toLowerCase()}`,
  linkCount,
  createdAt: `2026-09-01T${hour}:00:00Z`,
  updatedAt: "2026-09-01T00:00:00Z",
});
const campaigns = dashboardCampaigns(projects, {
  p1: [campaign("c1", "p1", "Beta", 10, "01")],
  p2: [campaign("c2", "p2", "Alpha", 11, "02")],
  deleted: [campaign("hidden", "deleted", "Stale", 0, "00")],
});
describe("ported dashboard behaviour", () => {
  it("joins current projects and keeps duplicate names separate", () => {
    expect(campaigns).toHaveLength(2);
    expect(campaignGroups(projects, campaigns, "", true, false).map((g) => [g.id, g.items.map((c) => c._id)])).toEqual([
      ["p1", ["c1"]],
      ["p2", ["c2"]],
    ]);
    expect(campaignGroups(projects, campaigns, "p2", true, true).map((g) => g.id)).toEqual(["p2"]);
    expect(campaignGroups(projects, campaigns, "", true, true)[2].items).toEqual([]);
  });
  it("searches actual fields, filters and sorts without mutating cached arrays", () => {
    expect(filterCampaigns(campaigns, "p2", "  ALPHA  ", "Created", false).map((c) => c._id)).toEqual(["c2"]);
    expect(filterCampaigns(campaigns, "p1", "alpha", "Name", true)).toEqual([]);
    expect(filterCampaigns(campaigns, "", "example.com/beta", "Name", true)[0]._id).toBe("c1");
    for (const ordering of ["Created", "Links"] as const)
      expect(filterCampaigns(campaigns, "", "", ("" + ordering) as typeof ordering, false)[0]._id).toBe("c2");
    expect(filterCampaigns(campaigns, "", "", "Name", true)[0]._id).toBe("c2");
    expect(campaigns[0]._id).toBe("c1");
  });
  it("preserves backend IDs, view and encoded link selections", () => {
    expect(dashboardHref()).toBe("/dashboard");
    expect(dashboardHref("p1")).toBe("/dashboard?project=p1");
    expect(dashboardHref("", "", "projects")).toBe("/dashboard?view=projects");
    const url = new URL(dashboardHref("p1", "c1", "analytics", "link & one"), "https://rat.test");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      project: "p1",
      campaign: "c1",
      view: "analytics",
      link: "link & one",
    });
  });
});
