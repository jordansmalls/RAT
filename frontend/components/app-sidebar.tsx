"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CircleHelpIcon, GitBranch } from "lucide-react"

const data = {
  navSecondary: [
    {
      title: "Contribute",
      url: "https://www.github.com/jordansmalls/rat",
      icon: <GitBranch />,
    },
    {
      title: "Support",
      url: "https://www.jsmalls.net",
      icon: <CircleHelpIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <span className="text-base font-semibold tracking-tight">
                Rich Analytics Tool
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <Button
          render={<Link href="/projects/new" />}
          nativeButton={false}
          variant="default"
          className="w-full hover:cursor-pointer"
        >
          <PlusIcon />
          <span className="tracking-tight">New Project</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
