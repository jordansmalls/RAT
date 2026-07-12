import { create } from "zustand"
import type { Project, Campaign, Link } from "@/lib/types"
import * as api from "@/lib/api"

interface ProjectStore {
  projects: Project[]
  campaigns: Campaign[]
  links: Link[]
  loading: boolean

  setLoading: (v: boolean) => void

  fetchProjects: () => Promise<void>
  fetchCampaigns: (pid: string) => Promise<void>
  fetchLinks: (cid: string) => Promise<void>

  createProject: (body: {
    clientName: string
    description: string
  }) => Promise<void>
  createCampaign: (body: {
    project_id: string
    title: string
    url: string
  }) => Promise<void>
  createLink: (body: {
    project_id: string
    campaign_id: string
    title: string
  }) => Promise<void>

  updateProject: (
    id: string,
    body: { clientName: string; description: string }
  ) => Promise<void>
  updateCampaign: (
    id: string,
    body: { title: string; url: string }
  ) => Promise<void>

  deleteProject: (id: string) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  campaigns: [],
  links: [],
  loading: false,

  setLoading: (v) => set({ loading: v }),

  fetchProjects: async () => {
    try {
      set({ loading: true })
      const response = await api.getProjects()
      // Handle different response formats
      const projects = Array.isArray(response) ? response : []
      console.log("Fetched projects:", projects)
      set({ projects })
    } catch (error) {
      console.error("Failed to fetch projects:", error)
      set({ projects: [] }) // Set empty array on error
    } finally {
      set({ loading: false })
    }
  },

  fetchCampaigns: async (pid) => {
    try {
      set({ loading: true })
      const response = await api.getCampaigns(pid)
      const campaigns = Array.isArray(response) ? response : []
      console.log("Fetched campaigns:", campaigns)
      set({ campaigns })
    } catch (error) {
      console.error("Failed to fetch campaigns:", error)
      set({ campaigns: [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchLinks: async (cid) => {
    try {
      set({ loading: true })
      const response = await api.getLinks(cid)
      const links = Array.isArray(response) ? response : []
      console.log("Fetched links:", links)
      set({ links })
    } catch (error) {
      console.error("Failed to fetch links:", error)
      set({ links: [] })
    } finally {
      set({ loading: false })
    }
  },

  createProject: async (body) => {
    try {
      set({ loading: true })
      await api.createProject(body)
      const response = await api.getProjects()
      const projects = Array.isArray(response) ? response : []
      set({ projects })
    } catch (error) {
      console.error("Failed to create project:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  createCampaign: async (body) => {
    try {
      set({ loading: true })
      await api.createCampaign(body)
      const response = await api.getCampaigns(body.project_id)
      const campaigns = Array.isArray(response) ? response : []
      set({ campaigns })
    } catch (error) {
      console.error("Failed to create campaign:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  createLink: async (body) => {
    try {
      set({ loading: true })
      await api.createLinkManual(body)
      const response = await api.getLinks(body.campaign_id)
      const links = Array.isArray(response) ? response : []
      set({ links })
    } catch (error) {
      console.error("Failed to create link:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateProject: async (id, body) => {
    try {
      set({ loading: true })
      await api.updateProject(id, body)
      const response = await api.getProjects()
      const projects = Array.isArray(response) ? response : []
      set({ projects })
    } catch (error) {
      console.error("Failed to update project:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateCampaign: async (id, body) => {
    try {
      set({ loading: true })
      const updated = await api.updateCampaign(id, body)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c._id === id ? updated : c)),
      }))
    } catch (error) {
      console.error("Failed to update campaign:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  deleteProject: async (id) => {
    try {
      set({ loading: true })
      await api.deleteProject(id)
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id),
      }))
    } catch (error) {
      console.error("Failed to delete project:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  deleteCampaign: async (id) => {
    try {
      set({ loading: true })
      await api.deleteCampaign(id)
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c._id !== id),
      }))
    } catch (error) {
      console.error("Failed to delete campaign:", error)
      throw error
    } finally {
      set({ loading: false })
    }
  },
}))
