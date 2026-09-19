import { create } from "zustand"
import type { Project, Campaign, Link } from "@/lib/types"
import * as api from "@/lib/api"

type ProjectBody = { clientName: string; description: string }
type CampaignBody = { project_id: string; title: string; url: string }

interface ProjectStore {
  projects: Project[]
  campaigns: Campaign[]
  campaignsByProject: Record<string, Campaign[]>
  campaignsLoading: Record<string, boolean>
  campaignErrors: Record<string, string | null>
  projectsLoading: boolean
  projectsError: string | null
  links: Link[]
  loading: boolean
  setLoading: (value: boolean) => void
  fetchProjects: () => Promise<void>
  fetchCampaigns: (projectId: string) => Promise<void>
  fetchLinks: (campaignId: string) => Promise<void>
  createProject: (body: ProjectBody) => Promise<Project>
  createCampaign: (body: CampaignBody) => Promise<Campaign>
  createLink: (body: {
    project_id: string
    campaign_id: string
    title: string
  }) => Promise<void>
  updateProject: (id: string, body: ProjectBody) => Promise<void>
  updateCampaign: (
    id: string,
    body: { title: string; url: string }
  ) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
}

// A request started before a mutation must not overwrite the newly saved data.
let projectRevision = 0
const campaignRevisions = new Map<string, number>()
const reviseCampaigns = (projectId: string) =>
  campaignRevisions.set(projectId, (campaignRevisions.get(projectId) ?? 0) + 1)
const campaignRequests = new Map<string, Promise<void>>()
let projectRequest: Promise<void> | undefined

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  campaigns: [],
  campaignsByProject: {},
  campaignsLoading: {},
  campaignErrors: {},
  projectsLoading: false,
  projectsError: null,
  links: [],
  loading: false,
  setLoading: (loading) => set({ loading }),

  fetchProjects: () => {
    if (projectRequest) return projectRequest
    const revision = projectRevision
    set({ projectsLoading: true, projectsError: null })
    projectRequest = api
      .getProjects()
      .then((projects) => {
        if (revision === projectRevision) set({ projects })
      })
      .catch(() => {
        set({ projectsError: "Could not load projects." })
      })
      .finally(() => {
        set({ projectsLoading: false })
        projectRequest = undefined
        if (revision !== projectRevision) void get().fetchProjects()
      })
    return projectRequest
  },

  fetchCampaigns: (projectId) => {
    const pending = campaignRequests.get(projectId)
    if (pending) return pending
    const revision = campaignRevisions.get(projectId) ?? 0
    set((state) => ({
      campaignsLoading: { ...state.campaignsLoading, [projectId]: true },
      campaignErrors: { ...state.campaignErrors, [projectId]: null },
    }))
    const request = api
      .getCampaigns(projectId)
      .then((campaigns) => {
        if (revision !== (campaignRevisions.get(projectId) ?? 0)) return
        set((state) => ({
          campaigns,
          campaignsByProject: {
            ...state.campaignsByProject,
            [projectId]: campaigns,
          },
        }))
      })
      .catch(() => {
        set((state) => ({
          campaignErrors: {
            ...state.campaignErrors,
            [projectId]: "Could not load campaigns.",
          },
        }))
      })
      .finally(() => {
        campaignRequests.delete(projectId)
        set((state) => ({
          campaignsLoading: { ...state.campaignsLoading, [projectId]: false },
        }))
        if (revision !== (campaignRevisions.get(projectId) ?? 0))
          void get().fetchCampaigns(projectId)
      })
    campaignRequests.set(projectId, request)
    return request
  },

  fetchLinks: async (campaignId) => {
    set({ loading: true })
    try {
      set({ links: await api.getLinks(campaignId) })
    } finally {
      set({ loading: false })
    }
  },

  createProject: async (body) => {
    set({ loading: true })
    try {
      const project = await api.createProject(body)
      projectRevision++
      set((state) => ({
        projects: [
          project,
          ...state.projects.filter((item) => item._id !== project._id),
        ],
        projectsError: null,
      }))
      return project
    } finally {
      set({ loading: false })
    }
  },

  createCampaign: async (body) => {
    set({ loading: true })
    try {
      const { campaign } = await api.createCampaign(body)
      reviseCampaigns(body.project_id)
      set((state) => {
        const campaigns = [
          campaign,
          ...(state.campaignsByProject[body.project_id] ?? []).filter(
            (item) => item._id !== campaign._id
          ),
        ]
        return {
          campaigns,
          campaignsByProject: {
            ...state.campaignsByProject,
            [body.project_id]: campaigns,
          },
        }
      })
      return campaign
    } finally {
      set({ loading: false })
    }
  },

  createLink: async (body) => {
    set({ loading: true })
    try {
      const link = await api.createLinkManual(body)
      set((state) => ({ links: [...state.links, link] }))
    } finally {
      set({ loading: false })
    }
  },

  updateProject: async (id, body) => {
    set({ loading: true })
    try {
      const project = await api.updateProject(id, body)
      projectRevision++
      set((state) => ({
        projects: state.projects.map((item) =>
          item._id === id ? project : item
        ),
      }))
    } finally {
      set({ loading: false })
    }
  },

  updateCampaign: async (id, body) => {
    set({ loading: true })
    try {
      const campaign = await api.updateCampaign(id, body)
      reviseCampaigns(campaign.project)
      set((state) => ({
        campaigns: state.campaigns.map((item) =>
          item._id === id ? campaign : item
        ),
        campaignsByProject: Object.fromEntries(
          Object.entries(state.campaignsByProject).map(([key, items]) => [
            key,
            items.map((item) => (item._id === id ? campaign : item)),
          ])
        ),
      }))
    } finally {
      set({ loading: false })
    }
  },

  deleteProject: async (id) => {
    set({ loading: true })
    try {
      await api.deleteProject(id)
      projectRevision++
      reviseCampaigns(id)
      set((state) => ({
        projects: state.projects.filter((item) => item._id !== id),
        campaignsByProject: Object.fromEntries(
          Object.entries(state.campaignsByProject).filter(([key]) => key !== id)
        ),
      }))
    } finally {
      set({ loading: false })
    }
  },

  deleteCampaign: async (id) => {
    set({ loading: true })
    try {
      await api.deleteCampaign(id)
      for (const [projectId, items] of Object.entries(
        get().campaignsByProject
      )) {
        if (items.some((item) => item._id === id)) reviseCampaigns(projectId)
      }
      set((state) => ({
        campaigns: state.campaigns.filter((item) => item._id !== id),
        campaignsByProject: Object.fromEntries(
          Object.entries(state.campaignsByProject).map(([key, items]) => [
            key,
            items.filter((item) => item._id !== id),
          ])
        ),
      }))
    } finally {
      set({ loading: false })
    }
  },
}))
