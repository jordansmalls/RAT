"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDownIcon, ChevronRightIcon, FolderIcon } from "lucide-react"

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

export function NavMain() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const {
    projects,
    fetchProjects,
    projectsLoading,
    projectsError,
    campaignsByProject,
    campaignsLoading,
    campaignErrors,
    fetchCampaigns,
  } = useProjectStore()
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(
    () => new Set()
  )
  const [collapsedProjects, setCollapsedProjects] = React.useState<Set<string>>(
    () => new Set()
  )
  const activeProject = pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)?.[1]
  React.useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  React.useEffect(() => {
    if (activeProject && activeProject !== "new")
      void fetchCampaigns(activeProject)
  }, [activeProject, fetchCampaigns])

  const toggleProject = (projectId: string) => {
    const isExpanded =
      !collapsedProjects.has(projectId) &&
      (expandedProjects.has(projectId) || activeProject === projectId)
    setCollapsedProjects((current) => {
      const next = new Set(current)
      if (isExpanded) next.add(projectId)
      else next.delete(projectId)
      return next
    })
    setExpandedProjects((current) => {
      const next = new Set(current)
      if (isExpanded) next.delete(projectId)
      else next.add(projectId)
      return next
    })
    if (!isExpanded) void fetchCampaigns(projectId)
  }

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
          {projectsError && (
            <button
              className="px-2 py-1 text-left text-xs text-destructive"
              onClick={() => void fetchProjects()}
            >
              {projectsError} Retry
            </button>
          )}
          <SidebarMenu>
            {projectsLoading && projects.length === 0 ? (
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
                const isExpanded =
                  !collapsedProjects.has(project._id) &&
                  (expandedProjects.has(project._id) ||
                    activeProject === project._id)
                const isProjectActive =
                  pathname.startsWith(projectHref) &&
                  !pathname.includes("/campaigns/")
                const projectCampaigns = campaignsByProject[project._id] ?? []
                const isLoadingCampaigns = campaignsLoading[project._id]

                return (
                  <SidebarMenuItem key={project._id}>
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md tracking-tight text-sidebar-foreground/70 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
                        ) : campaignErrors[project._id] ? (
                          <SidebarMenuSubItem>
                            <button
                              className="px-2 py-1 text-xs text-destructive"
                              onClick={() => void fetchCampaigns(project._id)}
                            >
                              Could not load. Retry
                            </button>
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
                                  isActive={
                                    pathname === campaignHref ||
                                    pathname.startsWith(`${campaignHref}/`)
                                  }
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
