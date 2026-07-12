import axios from "axios"
import type { Project, Campaign, Link, Click, AnalyticsData } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

const api = axios.create({
  baseURL: API_BASE,
})

// Projects
export const createProject = async (body: {
  clientName: string
  description: string
}): Promise<Project> => {
  const { data } = await api.post("/api/projects", body)
  return data.project // Extract from { message, project }
}

export const getProjects = async (): Promise<Project[]> => {
  try {
    const { data } = await api.get("/api/projects")
    return data.projects || [] // Extract from { message, projects }
  } catch (error: any) {
    // Backend returns 404 when no projects exist
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export const getProject = async (id: string): Promise<Project> => {
  const { data } = await api.get(`/api/projects/${id}`)
  return data.project // Extract from { project }
}

export const updateProject = async (
  id: string,
  body: { clientName: string; description: string }
): Promise<Project> => {
  const { data } = await api.put(`/api/projects/${id}`, body)
  return data.project // Extract from { message, project }
}

export const deleteProject = async (
  id: string
): Promise<{ message: string }> => {
  const { data } = await api.delete(`/api/projects/${id}`, {
    data: { confirmation: true },
  })
  return data // Returns { message }
}

// Campaigns
export const getCampaigns = async (projectId: string): Promise<Campaign[]> => {
  try {
    const { data } = await api.get(`/api/projects/${projectId}/campaigns`)
    return data.campaigns || [] // Extract from { message, campaigns }
  } catch (error: any) {
    // Backend returns 404 when no campaigns exist
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export const createCampaign = async (body: {
  project_id: string
  title: string
  url: string
}): Promise<{ campaign: Campaign; links: Link[] }> => {
  const { data } = await api.post("/api/campaigns", body)
  return { campaign: data.campaign, links: data.links } // Extract from { message, campaign, links }
}

export const getCampaign = async (id: string): Promise<Campaign> => {
  const { data } = await api.get(`/api/campaigns/${id}`)
  return data // Returns campaign object directly
}

export const updateCampaign = async (
  id: string,
  body: { title: string; url: string }
): Promise<Campaign> => {
  const { data } = await api.put(`/api/campaigns/${id}`, body)
  return data.campaign // Extract from { message, campaign }
}

export const deleteCampaign = async (id: string): Promise<void> => {
  await api.delete(`/api/campaigns/${id}`, {
    data: { confirmation: true },
  })
}

// Links
export const getLinks = async (campaignId: string): Promise<Link[]> => {
  try {
    const { data } = await api.get(`/api/campaigns/${campaignId}/links`)
    return data.links || [] // Extract from { message, links }
  } catch (error: any) {
    // Backend returns 404 when no links exist
    if (error.response?.status === 404) {
      return []
    }
    throw error
  }
}

export const createLinkManual = async (body: {
  project_id: string
  campaign_id: string
  title: string
}): Promise<Link> => {
  const { data } = await api.post("/api/campaigns/manual", body)
  return data.link // Extract from { message, link }
}

// Analytics
export const getHumanConfidence = async (
  projectId: string
): Promise<{ confidence: number }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/human-confidence`
  )
  return { confidence: data.confidence } // Extract from { message, confidence }
}

export const downloadClicks = async (
  projectId: string,
  format: "json" | "csv"
): Promise<Blob> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/export?format=${format}`,
    {
      responseType: "blob",
    }
  )
  return data
}

export const getClicksPerPlatform = async (
  projectId: string
): Promise<{ data: { platform: string; count: number }[] }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/clicks-per-platform`
  )
  return { data: data.data || [] } // Extract from { message, data }
}

export const getGlobalReach = async (
  projectId: string
): Promise<{ data: { country: string; count: number }[] }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/global-reach`
  )
  return { data: data.data || [] } // Extract from { message, data }
}

export const getPlatformEfficiency = async (
  projectId: string
): Promise<{ data: { platform: string; intent: number }[] }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/efficiency`
  )
  return { data: data.data || [] } // Extract from { message, data }
}

export const getGoldenHour = async (
  projectId: string
): Promise<{ heatmap: { day: number; hour: number; clicks: number }[] }> => {
  const { data } = await api.get(`/api/analytics/project/${projectId}/heatmap`)
  return { heatmap: data.heatmap || [] } // Extract from { message, heatmap }
}

export const getLoyalty = async (
  projectId: string
): Promise<{ uniqueIPs: number; totalClicks: number; ratio: number }> => {
  const { data } = await api.get(`/api/analytics/project/${projectId}/loyalty`)
  return {
    uniqueIPs: data.uniqueIPs || 0,
    totalClicks: data.totalClicks || 0,
    ratio: data.ratio || 0,
  } // Extract from { message, uniqueIPs, totalClicks, ratio }
}

export const getDeviceBreakdown = async (
  projectId: string
): Promise<{ mobile: number; tablet: number; desktop: number }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/device-breakdown`
  )
  return {
    mobile: data.mobile || 0,
    tablet: data.tablet || 0,
    desktop: data.desktop || 0,
  } // Extract from { message, mobile, tablet, desktop }
}

export const getRecentActivity = async (
  projectId: string
): Promise<{ data: Click[] }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/recent-activity`
  )
  return { data: data.data || [] } // Extract from { message, data }
}

export const getPlatformDominance = async (
  projectId: string
): Promise<{ data: { platform: string; share: number }[] }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/platform-dominance`
  )
  return { data: data.data || [] } // Extract from { message, data }
}

export const getNetworkEffect = async (
  projectId: string
): Promise<{ totalClicks: number; uniqueVisitors: number; ratio: number }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/network-effect`
  )
  return {
    totalClicks: data.totalClicks || 0,
    uniqueVisitors: data.uniqueVisitors || 0,
    ratio: data.ratio || 0,
  } // Extract from { message, totalClicks, uniqueVisitors, ratio }
}

export const getVelocity = async (
  projectId: string
): Promise<{ growth: number }> => {
  const { data } = await api.get(`/api/analytics/project/${projectId}/velocity`)
  return { growth: data.growth || 0 } // Extract from { message, growth }
}

export const getHeroCampaign = async (
  projectId: string
): Promise<{ campaignId: string; title: string; clickCount: number }> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/hero-campaign`
  )
  return {
    campaignId: data.campaignId || null,
    title: data.title || null,
    clickCount: data.clickCount || 0,
  } // Extract from { message, campaignId, title, clickCount }
}

export const getMonthlyHealth = async (
  projectId: string
): Promise<AnalyticsData> => {
  const { data } = await api.get(
    `/api/analytics/project/${projectId}/monthly-health`
  )
  return {
    networkEffect: data.networkEffect,
    dominance: data.dominance,
    velocity: data.velocity,
    heroCampaign: data.heroCampaign,
  } // Extract from { message, networkEffect, dominance, velocity, heroCampaign }
}
