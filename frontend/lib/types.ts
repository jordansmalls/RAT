export interface Project {
  _id: string
  clientName: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  _id: string
  project: string
  title: string
  url: string
  createdAt: string
  updatedAt: string
}

export interface Link {
  _id: string
  project: string
  campaign: string
  title: string
  platform: string
  slug: string
  destinationUrl: string
  customUrl: string
  isActive: boolean
  clickCount: number
  createdAt: string
  updatedAt: string
}

export interface Click {
  _id: string
  link: string
  campaign: string
  project: string
  destinationUrl: string
  clickedAt: string
  dayOfWeek: number
  hourOfDay: number
  fullDateClicked: string
  ip?: string
  geo?: {
    country?: string
    region?: string
    city?: string
    ll?: { lat: number; lon: number }
    timezone?: string
  }
  device: {
    type: string
    vendor?: string
    model?: string
    cpu?: { architecture?: string }
  }
  os: { name?: string; version?: string }
  browser: {
    name?: string
    version?: string
    major?: string
    engine?: { name?: string; version?: string }
  }
  referrer?: string
  isBot: boolean
}

export interface AnalyticsData {
  confidence?: number
  data?: any[]
  heatmap?: any[]
  uniqueIPs?: number
  totalClicks?: number
  ratio?: number
  mobile?: number
  tablet?: number
  desktop?: number
  growth?: number
  campaignId?: string
  title?: string
  clickCount?: number
  networkEffect?: any
  dominance?: any
  velocity?: any
  heroCampaign?: any
}
