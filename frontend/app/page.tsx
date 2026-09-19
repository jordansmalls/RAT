"use client"

import { useEffect } from "react"
import { Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useProjectStore } from "@/stores/useProjectStore"
import ProjectCard from "@/components/ProjectCard"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const {
    projects,
    projectsLoading,
    projectsError,
    fetchProjects,
    deleteProject,
  } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  if (projectsLoading && projects.length === 0) {
    return (
      <div className="content-wrapper flex min-h-[60vh] items-center justify-center p-6 sm:p-8 lg:p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="content-wrapper p-6 sm:p-8 lg:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Projects
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your link tracking projects.
          </p>
        </div>

        <Button
          className="w-full sm:w-auto"
          render={
            <Link href="/projects/new" className="flex items-center gap-2" />
          }
          nativeButton={false}
        >
          New Project
          <Plus size={18} />
        </Button>
      </div>

      {projectsError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {projectsError}{" "}
          <button onClick={() => void fetchProjects()} className="underline">
            Retry
          </button>
        </p>
      )}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-16 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">
            Get Started
          </h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Create your first project to start tracking campaign links and
            analyzing performance.
          </p>
          <Button
            render={
              <Link href="/projects/new" className="flex items-center gap-2" />
            }
            nativeButton={false}
          >
            Create your first project
            <Plus size={18} />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
