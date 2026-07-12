// "use client"

// import Link from "next/link"
// import { Trash2, Calendar, ExternalLink } from "lucide-react"
// import type { Project } from "@/lib/types"

// interface ProjectCardProps {
//   project: Project
//   onDelete: (id: string) => void
// }

// export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
//   const formatDate = (dateString: string) => {
//     return new Intl.DateTimeFormat("en-US", {
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     }).format(new Date(dateString))
//   }

//   const handleDelete = (e: React.MouseEvent) => {
//     e.preventDefault()
//     if (
//       window.confirm(
//         `Delete project "${project.clientName}"? This action cannot be undone.`
//       )
//     ) {
//       onDelete(project._id)
//     }
//   }

//   return (
//     <div className="card bg-base-100 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
//       <div className="card-body">
//         <div className="flex items-start justify-between">
//           <h2 className="card-title text-2xl font-bold">
//             {project.clientName}
//           </h2>
//           <button
//             onClick={handleDelete}
//             className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error hover:text-error-content"
//             aria-label="Delete project"
//           >
//             <Trash2 size={18} />
//           </button>
//         </div>

//         <p className="text-base-content min-h-[3rem] opacity-70">
//           {project.description || "No description provided"}
//         </p>

//         <div className="text-base-content mt-2 flex items-center gap-2 text-sm opacity-60">
//           <Calendar size={14} />
//           <span>Created {formatDate(project.createdAt)}</span>
//         </div>

//         <div className="card-actions mt-4 justify-end">
//           <Link
//             href={`/projects/${project._id}`}
//             className="btn btn-primary btn-sm gap-2"
//           >
//             View Details
//             <ExternalLink size={14} />
//           </Link>
//         </div>
//       </div>
//     </div>
//   )
// }

// ! good, next version is styled more

// "use client"

// import Link from "next/link"
// import { Trash2, Calendar, ExternalLink } from "lucide-react"
// import type { Project } from "@/lib/types"
// import { Button } from "./ui/button"

// interface ProjectCardProps {
//   project: Project
//   onDelete: (id: string) => void
// }

// export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
//   const formatDate = (dateString: string) => {
//     return new Intl.DateTimeFormat("en-US", {
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     }).format(new Date(dateString))
//   }

//   const handleDelete = (e: React.MouseEvent) => {
//     e.preventDefault()
//     if (
//       window.confirm(
//         `Delete project "${project.clientName}"? This action cannot be undone.`
//       )
//     ) {
//       onDelete(project._id)
//     }
//   }

//   return (
//     <div className="card bg-base-100 shadow-xl transition-shadow duration-300 hover:shadow-2xl">
//       <div className="card-body">
//         <div className="flex items-start justify-between">
//           <h2 className="card-title text-2xl font-bold">
//             {project.clientName}
//           </h2>
//           <Button
//             onClick={handleDelete}
//             // className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error hover:text-error-content"
//             variant={"outline"}
//             aria-label="Delete project"
//           >
//             <Trash2 size={18} />
//           </Button>
//         </div>

//         <p className="text-base-content min-h-[3rem] opacity-70">
//           {project.description || "No description provided"}
//         </p>

//         <div className="text-base-content mt-2 flex items-center gap-2 text-sm opacity-60">
//           <Calendar size={14} />
//           <span>Created {formatDate(project.createdAt)}</span>
//         </div>

//         <div className="card-actions mt-4 justify-end">
//           <Link
//             href={`/projects/${project._id}`}
//             className="btn btn-primary btn-sm gap-2"
//           >
//             View Details
//             <ExternalLink size={14} />
//           </Link>
//         </div>
//       </div>
//     </div>
//   )
// }

"use client"

import Link from "next/link"
import { Trash2, Calendar, ArrowUpRight } from "lucide-react"
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
    <Card className="group relative flex flex-col justify-between transition-all duration-200 hover:border-foreground/20 hover:shadow-md">
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
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 hover:cursor-pointer"
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
        {/* <Button asChild size="sm" className="ml-auto gap-1.5">
          <Link href={`/projects/${project._id}`}>
            View details
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Button> */}
        <Link href={`/projects/${project._id}`}>
          {/* <Button asChild size="sm" className="ml-auto gap-1.5"> */}
          <Button size="sm" className="ml-auto gap-1.5 hover:cursor-pointer">
            View details
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}