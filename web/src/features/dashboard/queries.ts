"use client";
import { queryOptions, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import * as api from "./api";
import type { Campaign, Project, Link, PerformanceWindow } from "./types";
import type { ProjectInput, CampaignInput, LinkInput } from "./schemas";
export const dashboardKeys = {
  all: ["dashboard"] as const,
  projects: ["dashboard", "projects"] as const,
  campaigns: (id: string) => ["dashboard", "campaigns", id] as const,
  campaign: (id: string) => ["dashboard", "campaign", id] as const,
  links: (id: string) => ["dashboard", "links", id] as const,
  performance: (id: string, range: PerformanceWindow) => ["dashboard", "performance", id, range] as const,
};
export const projectsOptions = queryOptions({
  queryKey: dashboardKeys.projects,
  queryFn: ({ signal }) => api.getProjects(signal),
});
export const campaignsOptions = (id: string) =>
  queryOptions({ queryKey: dashboardKeys.campaigns(id), queryFn: ({ signal }) => api.getCampaigns(id, signal) });
export function useCampaign(id: string) {
  return useQuery({ queryKey: dashboardKeys.campaign(id), queryFn: ({ signal }) => api.getCampaign(id, signal) });
}
export function useLinks(id: string) {
  return useQuery({ queryKey: dashboardKeys.links(id), queryFn: ({ signal }) => api.getLinks(id, signal) });
}
export function usePerformance(id: string, range: PerformanceWindow) {
  return useQuery({
    queryKey: dashboardKeys.performance(id, range),
    queryFn: ({ signal }) => api.getCampaignPerformance(id, range, signal),
  });
}

// Cancel reads before applying successful writes. A response that started before
// a mutation cannot replace the new record or resurrect a deleted record.
export function workspaceActions(client: ReturnType<typeof useQueryClient>) {
  const invalidateAnalytics = () => {
    void client.invalidateQueries({ queryKey: ["analytics"] });
    void client.invalidateQueries({ queryKey: ["dashboard", "performance"] });
  };
  return {
    fetchProjects: () => client.fetchQuery({ ...projectsOptions, staleTime: 0 }).catch(() => undefined),
    fetchCampaigns: (id: string) => client.fetchQuery({ ...campaignsOptions(id), staleTime: 0 }).catch(() => undefined),
    createProject: async (body: ProjectInput) => {
      const project = await api.createProject(body);
      await client.cancelQueries({ queryKey: dashboardKeys.projects });
      client.setQueryData<Project[]>(dashboardKeys.projects, (old = []) => [
        project,
        ...old.filter((item) => item._id !== project._id),
      ]);
      invalidateAnalytics();
      return project;
    },
    updateProject: async (id: string, body: ProjectInput) => {
      const project = await api.updateProject(id, body);
      await client.cancelQueries({ queryKey: dashboardKeys.projects });
      client.setQueryData<Project[]>(dashboardKeys.projects, (old = []) =>
        old.map((item) => (item._id === id ? project : item)),
      );
      invalidateAnalytics();
    },
    deleteProject: async (id: string) => {
      await api.deleteProject(id);
      await client.cancelQueries({ queryKey: dashboardKeys.all });
      client.setQueryData<Project[]>(dashboardKeys.projects, (old = []) => old.filter((item) => item._id !== id));
      client.removeQueries({ queryKey: dashboardKeys.campaigns(id) });
      invalidateAnalytics();
    },
    createCampaign: async (body: CampaignInput) => {
      const { campaign } = await api.createCampaign(body);
      await client.cancelQueries({ queryKey: dashboardKeys.campaigns(body.project_id) });
      client.setQueryData<Campaign[]>(dashboardKeys.campaigns(body.project_id), (old = []) => [
        campaign,
        ...old.filter((item) => item._id !== campaign._id),
      ]);
      invalidateAnalytics();
      return campaign;
    },
    updateCampaign: async (id: string, body: { title: string; url: string }) => {
      const campaign = await api.updateCampaign(id, body);
      await client.cancelQueries({ queryKey: dashboardKeys.campaigns(campaign.project) });
      client.setQueryData<Campaign[]>(dashboardKeys.campaigns(campaign.project), (old = []) =>
        old.map((item) => (item._id === id ? { ...item, ...campaign } : item)),
      );
      void client.invalidateQueries({ queryKey: dashboardKeys.campaign(id) });
      void client.invalidateQueries({ queryKey: dashboardKeys.links(id) });
      invalidateAnalytics();
    },
    deleteCampaign: async (id: string) => {
      await api.deleteCampaign(id);
      await client.cancelQueries({ queryKey: ["dashboard", "campaigns"] });
      client.setQueriesData<Campaign[]>({ queryKey: ["dashboard", "campaigns"] }, (old = []) =>
        old.filter((item) => item._id !== id),
      );
      client.removeQueries({ queryKey: dashboardKeys.links(id) });
      client.removeQueries({ queryKey: dashboardKeys.campaign(id) });
      invalidateAnalytics();
    },
    createLink: async (body: LinkInput) => {
      const link = await api.createLinkManual(body);
      await client.cancelQueries({ queryKey: dashboardKeys.campaigns(body.project_id) });
      await client.cancelQueries({ queryKey: dashboardKeys.links(body.campaign_id) });
      client.setQueryData<Campaign[]>(dashboardKeys.campaigns(body.project_id), (old = []) =>
        old.map((item) =>
          item._id === body.campaign_id
            ? { ...item, linkCount: item.linkCount === undefined ? undefined : item.linkCount + 1 }
            : item,
        ),
      );
      client.setQueryData<Link[]>(dashboardKeys.links(body.campaign_id), (old = []) => [...old, link]);
      invalidateAnalytics();
    },
  };
}
function useWorkspace() {
  const client = useQueryClient();
  const projects = useQuery(projectsOptions);
  const campaigns = useQueries({ queries: (projects.data ?? []).map((project) => campaignsOptions(project._id)) });
  const actions = useMemo(() => workspaceActions(client), [client]);
  const createProject = useMutation({ mutationFn: actions.createProject });
  const createCampaign = useMutation({ mutationFn: actions.createCampaign });
  const createLink = useMutation({ mutationFn: actions.createLink });
  const updateProject = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProjectInput }) => actions.updateProject(id, body),
  });
  const updateCampaign = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { title: string; url: string } }) =>
      actions.updateCampaign(id, body),
  });
  const deleteProject = useMutation({ mutationFn: actions.deleteProject });
  const deleteCampaign = useMutation({ mutationFn: actions.deleteCampaign });
  return {
    ...actions,
    createProject: createProject.mutateAsync,
    createCampaign: createCampaign.mutateAsync,
    createLink: createLink.mutateAsync,
    updateProject: (id: string, body: ProjectInput) => updateProject.mutateAsync({ id, body }),
    updateCampaign: (id: string, body: { title: string; url: string }) => updateCampaign.mutateAsync({ id, body }),
    deleteProject: deleteProject.mutateAsync,
    deleteCampaign: deleteCampaign.mutateAsync,
    projects: projects.data ?? [],
    projectsLoading: projects.isPending,
    projectsError: projects.isError ? "Could not load projects." : null,
    campaignsByProject: Object.fromEntries((projects.data ?? []).map((p, i) => [p._id, campaigns[i].data])) as Record<
      string,
      Campaign[]
    >,
    campaignsLoading: Object.fromEntries((projects.data ?? []).map((p, i) => [p._id, campaigns[i].isPending])),
    campaignErrors: Object.fromEntries(
      (projects.data ?? []).map((p, i) => [p._id, campaigns[i].isError ? "Could not load campaigns." : null]),
    ),
  };
}
type Workspace = ReturnType<typeof useWorkspace>;
export function useProjectStore(): Workspace;
export function useProjectStore<T>(selector: (state: Workspace) => T): T;
export function useProjectStore<T>(selector?: (state: Workspace) => T) {
  const state = useWorkspace();
  return selector ? selector(state) : state;
}
