"use client"

import Link from "next/link"
import { Trash2, ArrowUpRight } from "lucide-react"
import type { Project } from "@/lib/types"
import { Button } from "./ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card"

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    if (
      window.confirm(
        `Delete project "${project.clientName}"? This action cannot be undone.`
      )
    ) {
      onDelete(project._id)
    }
  }

  return (
    <Card className="group relative flex flex-col justify-between transition-[border-color,box-shadow] duration-200 ease-in hover:border-foreground/20 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-xl leading-tight tracking-tight">
            {project.clientName}
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
            {project.description || "No description provided"}
          </CardDescription>
        </div>

        <Button
          onClick={handleDelete}
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:cursor-pointer hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
          aria-label="Delete project"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {/* <Calendar className="h-3.5 w-3.5" /> */}
          <span className="text-xs">
            Started on {formatDate(project.createdAt)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button
          render={<Link href={`/projects/${project._id}`} />}
          nativeButton={false}
          size="sm"
          className="ml-auto gap-1.5"
        >
          View details
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
