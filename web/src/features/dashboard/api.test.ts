import { afterEach, beforeEach, it, expect, vi } from "vitest";
import {
  getProjects,
  getCampaigns,
  getCampaign,
  createCampaign,
  createLinkManual,
  deleteProject,
  getCampaignPerformance,
} from "./api";
import { getAnalyticsOverview, getMetric, downloadClicks } from "@/features/analytics/api";
import { saveSocials } from "@/features/onboarding/api";
import { refreshSocialCounts } from "@/features/socials/api";
import { ApiError } from "@/lib/api";
const fetchMock = vi.fn<typeof fetch>();
const respond = (data: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }),
  );
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  document.cookie = "XSRF-TOKEN=test; path=/";
});
afterEach(() => vi.unstubAllGlobals());
it("unwraps only the Laravel resource and preserves old domain nesting", async () => {
  respond({ data: { message: "ok", projects: [{ _id: "p1" }] } });
  expect(await getProjects()).toEqual([{ _id: "p1" }]);
  respond({ data: { message: "ok", campaigns: [{ _id: "c1" }] } });
  expect(await getCampaigns("p1")).toEqual([{ _id: "c1" }]);
  respond({ data: { _id: "c1", title: "Launch" } });
  expect(await getCampaign("c1")).toEqual({ _id: "c1", title: "Launch" });
  respond({ data: { data: [{ platform: "youtube", count: 5 }] } });
  expect(await getMetric("p1", "clicks-per-platform")).toEqual({ data: [{ platform: "youtube", count: 5 }] });
  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    "/api/v1/projects",
    "/api/v1/projects/p1/campaigns",
    "/api/v1/campaigns/c1",
    "/api/v1/analytics/project/p1/clicks-per-platform",
  ]);
});
it("handles legacy empty lists while retaining missing ownership errors", async () => {
  respond({ message: "No projects found." }, 404);
  expect(await getProjects()).toEqual([]);
  respond({ message: "No campaigns found." }, 404);
  expect(await getCampaigns("p1")).toEqual([]);
  respond({ message: "Project not found." }, 404);
  await expect(getCampaigns("p1")).rejects.toBeInstanceOf(ApiError);
});
it("posts snake-case parent IDs and keeps the API-provided short URL", async () => {
  respond({ data: { campaign: { _id: "c1" }, links: [{ customUrl: "http://localhost:4000/abc1" }] } });
  expect(await createCampaign({ project_id: "p1", title: "Launch", url: "https://example.com" })).toMatchObject({
    campaign: { _id: "c1", linkCount: 1 },
  });
  respond({ data: { link: { _id: "l1", customUrl: "http://localhost:4000/abc1" } } });
  expect(await createLinkManual({ project_id: "p1", campaign_id: "c1", title: "News" })).toEqual({
    _id: "l1",
    customUrl: "http://localhost:4000/abc1",
  });
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
    project_id: "p1",
    campaign_id: "c1",
    title: "News",
  });
  expect(fetchMock.mock.calls[1][1]?.credentials).toBe("include");
});
it("confirms deletion explicitly", async () => {
  respond({ data: { message: "Deleted" } });
  await deleteProject("p1");
  expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ confirmation: true });
});
it("uses window for overview/performance and scopes lifetime metrics by linkId", async () => {
  respond({ data: { window: "7d" } });
  await getCampaignPerformance("c1", "7d");
  respond({ data: { window: "24h" } });
  await getAnalyticsOverview({ window: "24h", projectId: "p1", campaignId: "c1", linkId: "l1" });
  respond({ data: { confidence: 95 } });
  await getMetric("p1", "human-confidence", "l1");
  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    "/api/v1/campaigns/c1/performance?window=7d",
    "/api/v1/analytics/overview?window=24h&projectId=p1&campaignId=c1&linkId=l1",
    "/api/v1/analytics/project/p1/human-confidence?linkId=l1",
  ]);
});
it("downloads exports as blobs without attempting resource unwrapping", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response("platform,count\nyoutube,5", { headers: { "Content-Type": "text/csv" } }),
  );
  const blob = await downloadClicks("p1", "csv", "l1");
  expect(await blob.text()).toBe("platform,count\nyoutube,5");
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/analytics/project/p1/export?format=csv&linkId=l1");
});
it("social onboarding uses PUT and returns the new user resource", async () => {
  respond({ data: { id: "user1", onboarding_step: "complete" } });
  expect(await saveSocials({ youtube: "@jay", instagram: "jay", twitter: "", twitch: "" })).toMatchObject({
    onboarding_step: "complete",
  });
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/onboarding/socials");
  expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");
});
it("keeps the saved counts a provider-wide 502 refresh failure still returns", async () => {
  const profiles = [
    {
      platform: "youtube",
      identifier: "@jay",
      displayName: "Jay",
      count: 123,
      approximate: false,
      syncedAt: "2026-10-01T00:00:00.000Z",
      lastError: "Unavailable",
    },
  ];
  respond({ data: { profiles, results: [{ platform: "youtube", status: "error" }] } }, 502);
  expect(await refreshSocialCounts()).toEqual({ profiles });
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/socials/refresh");
});
it("still rejects a 502 without counts, and other refresh errors", async () => {
  respond({ message: "Bad gateway" }, 502);
  await expect(refreshSocialCounts()).rejects.toMatchObject({ status: 502 });
  respond({ message: "Unauthenticated." }, 401);
  await expect(refreshSocialCounts()).rejects.toMatchObject({ status: 401 });
});
it("reads recent activity rows, which carry no _id", async () => {
  const row = { clickedAt: "2026-10-01T00:00:00.000Z", platform: "youtube", device: { type: "mobile" } };
  respond({ data: { message: "Recent activity retrieved", data: [row] } });
  expect((await getMetric("p1", "recent-activity")).data).toEqual([row]);
});
