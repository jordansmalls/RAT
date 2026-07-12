// "use client"

// import { useEffect } from "react"
// import { Plus } from "lucide-react"
// import Link from "next/link"
// import { useProjectStore } from "@/stores/useProjectStore"
// import ProjectCard from "@/components/ProjectCard"
// // import { Button } from "@base-ui/react"
// import { Button } from "../components/ui/button"

// export default function HomePage() {
//   const { projects, loading, fetchProjects, deleteProject } = useProjectStore()

//   useEffect(() => {
//     fetchProjects()
//   }, [fetchProjects])

//   if (loading) {
//     return (
//       <div className="content-wrapper">
//         <div className="flex min-h-[60vh] items-center justify-center">
//           <span className="loading loading-spinner loading-lg text-primary"></span>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="content-wrapper">
//       <div className="mb-8">
//         <div className="mb-2 flex items-center justify-between">
//           <h1 className="text-4xl font-bold tracking-[-0.10rem]">Projects</h1>
//           <Button variant="default">
//             <Link
//               href="/projects/new"
//               className="btn btn-primary flex items-center gap-2"
//             >
//               New Project
//               <Plus size={20} />
//             </Link>
//           </Button>
//         </div>
//         <p className="text-base-content opacity-70">
//           Manage your link tracking projects.
//         </p>
//       </div>

//       {projects.length === 0 ? (
//         <div className="card bg-base-200 shadow-xl">
//           <div className="card-body items-center py-16 text-center">
//             <h2 className="mb-4 text-2xl font-semibold">No Projects Yet</h2>
//             <p className="text-base-content mb-6 max-w-md opacity-70">
//               Get started by creating your first project to track campaign links
//               and analyze performance.
//             </p>
//             <Button variant={"default"}>
//               <Link href="/projects/new" className="btn btn-primary gap-2 flex items-center">
//                 Create Your First Project
//                 <Plus size={20} />
//               </Link>
//             </Button>
//           </div>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
//           {projects.map((project) => (
//             <ProjectCard
//               key={project._id}
//               project={project}
//               onDelete={deleteProject}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }

"use client"

import { useEffect } from "react"
import { Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useProjectStore } from "@/stores/useProjectStore"
import ProjectCard from "@/components/ProjectCard"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  if (loading) {
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

        <Button asChild className="w-full sm:w-auto">
          <Link href="/projects/new" className="flex items-center gap-2">
            New Project
            <Plus size={18} />
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border bg-card px-6 py-16 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-semibold">No projects yet</h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Create your first project to start tracking campaign links and
            analyzing performance.
          </p>
          <Button asChild>
            <Link href="/projects/new" className="flex items-center gap-2">
              Create your first project
              <Plus size={18} />
            </Link>
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