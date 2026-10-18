import { api, errorMessage, isApiError, type Resource } from "@/lib/api";
import type { Project, Campaign, Link, CampaignPerformance, PerformanceWindow } from "./types";
import type { ProjectInput, CampaignInput, LinkInput } from "./schemas";
export const apiError = errorMessage;
const id = encodeURIComponent;
export async function getProjects(signal?: AbortSignal) {
  try {
    return (await api.get<Resource<{ projects: Project[] }>>("/api/v1/projects", { signal })).data.projects;
  } catch (error) {
    if (isApiError(error) && error.status === 404 && /^No projects found\.?$/.test(error.message)) return [];
    throw error;
  }
}
export async function getProject(project: string, signal?: AbortSignal) {
  return (await api.get<Resource<{ project: Project }>>(`/api/v1/projects/${id(project)}`, { signal })).data.project;
}
export async function createProject(body: ProjectInput) {
  return (await api.post<Resource<{ project: Project }>>("/api/v1/projects", body)).data.project;
}
export async function updateProject(project: string, body: ProjectInput) {
  return (await api.put<Resource<{ project: Project }>>(`/api/v1/projects/${id(project)}`, body)).data.project;
}
export async function deleteProject(project: string) {
  return (await api.delete<Resource<{ message: string }>>(`/api/v1/projects/${id(project)}`, { confirmation: true }))
    .data;
}
export async function getCampaigns(project: string, signal?: AbortSignal) {
  try {
    return (await api.get<Resource<{ campaigns: Campaign[] }>>(`/api/v1/projects/${id(project)}/campaigns`, { signal }))
      .data.campaigns;
  } catch (error) {
    if (isApiError(error) && error.status === 404 && /^No campaigns found\.?$/.test(error.message)) return [];
    throw error;
  }
}
export async function getCampaign(campaign: string, signal?: AbortSignal) {
  return (await api.get<Resource<Campaign>>(`/api/v1/campaigns/${id(campaign)}`, { signal })).data;
}
export async function createCampaign(body: CampaignInput) {
  const { data } = await api.post<Resource<{ campaign: Campaign; links: Link[] }>>("/api/v1/campaigns", body);
  return { ...data, campaign: { ...data.campaign, linkCount: data.links.length } };
}
export async function updateCampaign(campaign: string, body: { title: string; url: string }) {
  return (await api.put<Resource<{ campaign: Campaign }>>(`/api/v1/campaigns/${id(campaign)}`, body)).data.campaign;
}
export async function deleteCampaign(campaign: string) {
  await api.delete(`/api/v1/campaigns/${id(campaign)}`, { confirmation: true });
}
export async function getLinks(campaign: string, signal?: AbortSignal) {
  try {
    return (await api.get<Resource<{ links: Link[] }>>(`/api/v1/campaigns/${id(campaign)}/links`, { signal })).data
      .links;
  } catch (error) {
    if (isApiError(error) && error.status === 404 && /^No links found\.?$/.test(error.message)) return [];
    throw error;
  }
}
export async function createLinkManual(body: LinkInput) {
  return (await api.post<Resource<{ link: Link }>>("/api/v1/campaigns/manual", body)).data.link;
}
export async function getCampaignPerformance(campaign: string, window: PerformanceWindow, signal?: AbortSignal) {
  return (
    await api.get<Resource<CampaignPerformance>>(`/api/v1/campaigns/${id(campaign)}/performance`, {
      query: { window },
      signal,
    })
  ).data;
}
