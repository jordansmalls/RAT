import { beforeEach, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { workspaceActions, dashboardKeys, projectsOptions, campaignsOptions } from "./queries";
import * as api from "./api";
import type { Project, Campaign, Link } from "./types";
vi.mock("./api", () => ({
  getProjects: vi.fn(),
  getCampaigns: vi.fn(),
  createProject: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  createLinkManual: vi.fn(),
  deleteProject: vi.fn(),
}));
const project = {
  _id: "p1",
  clientName: "Launch",
  description: "Test",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} satisfies Project;
const campaign = {
  _id: "c1",
  project: "p1",
  title: "Launch",
  url: "https://example.com",
  linkCount: 10,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} satisfies Campaign;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
let client: QueryClient;
beforeEach(() => {
  vi.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});
it("a new project appears immediately and survives an older read", async () => {
  const old = deferred<Project[]>();
  vi.mocked(api.getProjects).mockReturnValue(old.promise);
  vi.mocked(api.createProject).mockResolvedValue(project);
  const read = client.fetchQuery(projectsOptions).catch(() => undefined);
  await workspaceActions(client).createProject({ clientName: "Launch", description: "Test" });
  old.resolve([]);
  await read;
  expect(client.getQueryData(dashboardKeys.projects)).toEqual([project]);
});
it("creates, edits and deletes campaigns in the shared query cache", async () => {
  const actions = workspaceActions(client);
  vi.mocked(api.createCampaign).mockResolvedValue({ campaign, links: [] });
  vi.mocked(api.updateCampaign).mockResolvedValue({ ...campaign, title: "Edited" });
  vi.mocked(api.deleteCampaign).mockResolvedValue();
  await actions.createCampaign({ project_id: "p1", title: "Launch", url: "https://example.com" });
  expect(client.getQueryData(dashboardKeys.campaigns("p1"))).toEqual([campaign]);
  await actions.updateCampaign("c1", { title: "Edited", url: "https://example.com" });
  expect(client.getQueryData<Campaign[]>(dashboardKeys.campaigns("p1"))?.[0].title).toBe("Edited");
  await actions.deleteCampaign("c1");
  expect(client.getQueryData(dashboardKeys.campaigns("p1"))).toEqual([]);
});
it("retains cached projects after a failed refresh and exposes the error", async () => {
  client.setQueryData(dashboardKeys.projects, [project]);
  vi.mocked(api.getProjects).mockRejectedValue(new Error("offline"));
  await workspaceActions(client).fetchProjects();
  expect(client.getQueryData(dashboardKeys.projects)).toEqual([project]);
  expect(client.getQueryState(dashboardKeys.projects)?.status).toBe("error");
});
it("campaign reads for other projects remain independent during a write", async () => {
  const delayed = deferred<Campaign[]>();
  vi.mocked(api.getCampaigns).mockReturnValue(delayed.promise);
  const read = client.fetchQuery(campaignsOptions("p2"));
  vi.mocked(api.createCampaign).mockResolvedValue({ campaign, links: [] });
  await workspaceActions(client).createCampaign({ project_id: "p1", title: "Launch", url: "https://example.com" });
  delayed.resolve([{ ...campaign, _id: "c2", project: "p2" }]);
  await read;
  expect(client.getQueryData<Campaign[]>(dashboardKeys.campaigns("p1"))?.[0]._id).toBe("c1");
  expect(client.getQueryData<Campaign[]>(dashboardKeys.campaigns("p2"))?.[0]._id).toBe("c2");
});
it("manual link creation increments only its campaign and rejects an older read", async () => {
  const old = deferred<Campaign[]>();
  vi.mocked(api.getCampaigns).mockReturnValue(old.promise);
  const second = { ...campaign, _id: "c2", linkCount: 2 };
  client.setQueryData(dashboardKeys.campaigns("p1"), [campaign, second]);
  const read = client.fetchQuery({ ...campaignsOptions("p1"), staleTime: 0 }).catch(() => undefined);
  const link = {
    _id: "l1",
    campaign: "c1",
    project: "p1",
    title: "Newsletter",
    platform: "manual",
    slug: "abcd",
    customUrl: "http://localhost:4000/abcd",
    destinationUrl: "https://example.com",
    isActive: true,
    clickCount: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  } satisfies Link;
  vi.mocked(api.createLinkManual).mockResolvedValue(link);
  await workspaceActions(client).createLink({ project_id: "p1", campaign_id: "c1", title: "Newsletter" });
  old.resolve([campaign]);
  await read;
  expect(client.getQueryData<Campaign[]>(dashboardKeys.campaigns("p1"))?.map((c) => c.linkCount)).toEqual([11, 2]);
  expect(client.getQueryData(dashboardKeys.links("c1"))).toEqual([link]);
});
it("campaign edits preserve the cached link count if the mutation omits it", async () => {
  client.setQueryData(dashboardKeys.campaigns("p1"), [campaign]);
  const { linkCount: _count, ...updated } = campaign;
  void _count;
  vi.mocked(api.updateCampaign).mockResolvedValue({ ...updated, title: "Revised" });
  await workspaceActions(client).updateCampaign("c1", { title: "Revised", url: "https://example.com/new" });
  expect(client.getQueryData<Campaign[]>(dashboardKeys.campaigns("p1"))?.[0]).toMatchObject({
    title: "Revised",
    linkCount: 10,
  });
});
