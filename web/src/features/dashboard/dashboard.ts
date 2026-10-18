import type { Campaign, Project } from "./types";

export type DashboardCampaign = Campaign & { projectName: string };
export type DashboardOrdering = "Created" | "Name" | "Links";

// Project IDs keep equally named projects separate, including empty projects.
export function dashboardCampaigns(
  projects: Project[],
  campaignsByProject: Record<string, Campaign[]>,
): DashboardCampaign[] {
  return projects.flatMap((project) =>
    (campaignsByProject[project._id] ?? []).map((campaign) => ({
      ...campaign,
      project: project._id,
      projectName: project.clientName,
    })),
  );
}

export function filterCampaigns(
  campaigns: DashboardCampaign[],
  projectId: string,
  query: string,
  ordering: DashboardOrdering,
  ascending: boolean,
) {
  const search = query.trim().toLowerCase();
  return campaigns
    .filter(
      (campaign) =>
        (!projectId || campaign.project === projectId) &&
        `${campaign._id} ${campaign.title} ${campaign.projectName} ${campaign.url}`.toLowerCase().includes(search),
    )
    .sort((a, b) => {
      const result =
        ordering === "Name"
          ? a.title.localeCompare(b.title)
          : ordering === "Links"
            ? (a.linkCount ?? -1) - (b.linkCount ?? -1)
            : Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return (ascending ? result : -result) || a._id.localeCompare(b._id);
    });
}

export function campaignGroups(
  projects: Project[],
  campaigns: DashboardCampaign[],
  projectId: string,
  grouped: boolean,
  showEmpty: boolean,
) {
  if (!grouped) return campaigns.length || showEmpty ? [{ id: "all", name: "All campaigns", items: campaigns }] : [];
  return projects
    .filter((project) => !projectId || project._id === projectId)
    .map((project) => ({
      id: project._id,
      name: project.clientName,
      items: campaigns.filter((campaign) => campaign.project === project._id),
    }))
    .filter((group) => showEmpty || group.items.length);
}

export function dashboardHref(projectId = "", campaignId = "", view = "campaigns", link = "") {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (campaignId) params.set("campaign", campaignId);
  if (view !== "campaigns") params.set("view", view);
  if (link) params.set("link", link);
  return `/dashboard${params.size ? `?${params}` : ""}`;
}
