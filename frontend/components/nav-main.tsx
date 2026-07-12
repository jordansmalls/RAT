"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
} from "lucide-react"

import { getCampaigns } from "@/lib/api"
import type { Campaign } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useProjectStore } from "@/stores/useProjectStore"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

type CampaignsByProject = Record<string, Campaign[]>

export function NavMain() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const { projects, fetchProjects, loading } = useProjectStore()
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(
    () => new Set()
  )
  const [campaignsByProject, setCampaignsByProject] =
    React.useState<CampaignsByProject>({})
  const [loadingCampaigns, setLoadingCampaigns] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const loadProjectCampaigns = React.useCallback(
    async (projectId: string) => {
      if (campaignsByProject[projectId] || loadingCampaigns.has(projectId)) {
        return
      }

      setLoadingCampaigns((current) => new Set(current).add(projectId))

      try {
        const campaigns = await getCampaigns(projectId)
        setCampaignsByProject((current) => ({
          ...current,
          [projectId]: campaigns,
        }))
      } catch (error) {
        console.error("Failed to fetch sidebar campaigns:", error)
        setCampaignsByProject((current) => ({
          ...current,
          [projectId]: [],
        }))
      } finally {
        setLoadingCampaigns((current) => {
          const next = new Set(current)
          next.delete(projectId)
          return next
        })
      }
    },
    [campaignsByProject, loadingCampaigns]
  )

  const toggleProject = React.useCallback(
    (projectId: string) => {
      setExpandedProjects((current) => {
        const next = new Set(current)
        if (next.has(projectId)) {
          next.delete(projectId)
        } else {
          next.add(projectId)
          void loadProjectCampaigns(projectId)
        }
        return next
      })
    },
    [loadProjectCampaigns]
  )

  React.useEffect(() => {
    const [, projectId] =
      pathname.match(/^\/projects\/([^/]+)(?:\/|$)/) ?? []

    if (!projectId || projectId === "new") {
      return
    }

    setExpandedProjects((current) => {
      if (current.has(projectId)) {
        return current
      }

      return new Set(current).add(projectId)
    })
    void loadProjectCampaigns(projectId)
  }, [loadProjectCampaigns, pathname])

  const closeMobileSidebar = () => setOpenMobile(false)

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="All Projects"
              isActive={pathname === "/"}
              render={<Link href="/" onClick={closeMobileSidebar} />}
            >
              <FolderIcon />
              <span>All Projects</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarMenu>
            {loading && projects.length === 0 ? (
              <>
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </>
            ) : projects.length === 0 ? (
              <SidebarMenuItem>
                <div className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                  No projects yet.
                </div>
              </SidebarMenuItem>
            ) : (
              projects.map((project) => {
                const projectHref = `/projects/${project._id}`
                const isExpanded = expandedProjects.has(project._id)
                const isProjectActive =
                  pathname.startsWith(projectHref) &&
                  !pathname.includes("/campaigns/")
                const projectCampaigns = campaignsByProject[project._id] ?? []
                const isLoadingCampaigns = loadingCampaigns.has(project._id)

                return (
                  <SidebarMenuItem key={project._id}>
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring tracking-tight"
                        )}
                        onClick={() => toggleProject(project._id)}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${
                          project.clientName
                        } campaigns`}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="size-4" />
                        ) : (
                          <ChevronRightIcon className="size-4" />
                        )}
                      </button>
                      <SidebarMenuButton
                        className="min-w-0 flex-1"
                        tooltip={project.clientName}
                        isActive={isProjectActive}
                        render={
                          <Link
                            href={projectHref}
                            onClick={closeMobileSidebar}
                          />
                        }
                      >
                        <span>{project.clientName}</span>
                      </SidebarMenuButton>
                    </div>

                    {isExpanded ? (
                      <SidebarMenuSub className="mt-1">
                        {isLoadingCampaigns ? (
                          <SidebarMenuSubItem>
                            <div className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                              Loading campaigns...
                            </div>
                          </SidebarMenuSubItem>
                        ) : projectCampaigns.length === 0 ? (
                          <SidebarMenuSubItem>
                            <div className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                              No campaigns
                            </div>
                          </SidebarMenuSubItem>
                        ) : (
                          projectCampaigns.map((campaign) => {
                            const campaignHref = `${projectHref}/campaigns/${campaign._id}`

                            return (
                              <SidebarMenuSubItem key={campaign._id}>
                                <SidebarMenuSubButton
                                  size="sm"
                                  isActive={pathname === campaignHref}
                                  render={
                                    <Link
                                      href={campaignHref}
                                      onClick={closeMobileSidebar}
                                    />
                                  }
                                >
                                  <span>{campaign.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })
                        )}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                )
              })
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
