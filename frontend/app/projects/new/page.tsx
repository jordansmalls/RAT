// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { ArrowLeft } from "lucide-react"
// import Link from "next/link"
// import { useProjectStore } from "@/stores/useProjectStore"

// export default function NewProjectPage() {
//   const router = useRouter()
//   const { createProject, loading } = useProjectStore()
//   const [formData, setFormData] = useState({
//     clientName: "",
//     description: "",
//   })
//   const [error, setError] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")

//     if (!formData.clientName.trim()) {
//       setError("Project name is required")
//       return
//     }

//     try {
//       await createProject(formData)
//       router.push("/")
//     } catch (err) {
//       setError("Failed to create project. Please try again.")
//       console.error(err)
//     }
//   }

//   return (
//     <div className="content-wrapper">
//       <div className="mb-8">
//         <Link href="/" className="btn btn-ghost mb-4 gap-2">
//           <ArrowLeft size={20} />
//           Back to Projects
//         </Link>
//         <h1 className="text-4xl font-bold tracking-[-0.10rem]">
//           Create New Project
//         </h1>
//         <p className="text-base-content mt-2 opacity-70">
//           Start tracking links for a new client or campaign
//         </p>
//       </div>

//       <div className="max-w-2xl">
//         <div className="card bg-base-100 shadow-xl">
//           <div className="card-body">
//             <form onSubmit={handleSubmit} className="space-y-6">
//               {error && (
//                 <div className="alert alert-error">
//                   <span>{error}</span>
//                 </div>
//               )}

//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text font-semibold">
//                     Project Name *
//                   </span>
//                 </label>
//                 <input
//                   type="text"
//                   placeholder="e.g., Acme Corp Marketing"
//                   className="input input-bordered"
//                   value={formData.clientName}
//                   onChange={(e) =>
//                     setFormData({ ...formData, clientName: e.target.value })
//                   }
//                   required
//                 />
//               </div>

//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text font-semibold">Description</span>
//                 </label>
//                 <textarea
//                   placeholder="Brief description of this project..."
//                   className="textarea textarea-bordered h-24"
//                   value={formData.description}
//                   onChange={(e) =>
//                     setFormData({ ...formData, description: e.target.value })
//                   }
//                 />
//               </div>

//               <div className="card-actions justify-end pt-4">
//                 <Link href="/" className="btn btn-ghost">
//                   Cancel
//                 </Link>
//                 <button
//                   type="submit"
//                   className="btn btn-primary"
//                   disabled={loading}
//                 >
//                   {loading ? (
//                     <>
//                       <span className="loading loading-spinner loading-sm"></span>
//                       Creating...
//                     </>
//                   ) : (
//                     "Create Project"
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


// ! attempt 1

// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
// import Link from "next/link"
// import { useProjectStore } from "@/stores/useProjectStore"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Textarea } from "@/components/ui/textarea"
// import { Label } from "@/components/ui/label"
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// export default function NewProjectPage() {
//   const router = useRouter()
//   const { createProject, loading } = useProjectStore()
//   const [formData, setFormData] = useState({
//     clientName: "",
//     description: "",
//   })
//   const [error, setError] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")

//     if (!formData.clientName.trim()) {
//       setError("Project name is required")
//       return
//     }

//     try {
//       await createProject(formData)
//       router.push("/")
//     } catch (err) {
//       setError("Failed to create project. Please try again.")
//       console.error(err)
//     }
//   }

//   return (
//     <div className="container max-w-2xl py-6 lg:py-10">
//       <div className="mb-8 space-y-4">
//         <Button asChild variant="ghost" size="sm" className="gap-2">
//           <Link href="/">
//             <ArrowLeft size={16} />
//             Back to Projects
//           </Link>
//         </Button>
//         <div>
//           <h1 className="text-4xl font-bold tracking-tight">
//             Create New Project
//           </h1>
//           <p className="mt-2 text-muted-foreground">
//             Start tracking links for a new client or campaign
//           </p>
//         </div>
//       </div>

//       <Card>
//         <CardContent className="pt-6">
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {error && (
//               <Alert variant="destructive">
//                 <AlertCircle className="h-4 w-4" />
//                 <AlertTitle>Error</AlertTitle>
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="clientName" className="font-semibold">
//                 Project Name <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="clientName"
//                 type="text"
//                 placeholder="e.g., Acme Corp Marketing"
//                 value={formData.clientName}
//                 onChange={(e) =>
//                   setFormData({ ...formData, clientName: e.target.value })
//                 }
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="description" className="font-semibold">
//                 Description
//               </Label>
//               <Textarea
//                 id="description"
//                 placeholder="Brief description of this project..."
//                 className="h-24 resize-none"
//                 value={formData.description}
//                 onChange={(e) =>
//                   setFormData({ ...formData, description: e.target.value })
//                 }
//               />
//             </div>

//             <div className="flex items-center justify-end gap-4 border-t pt-4">
//               <Button asChild variant="ghost">
//                 <Link href="/">Cancel</Link>
//               </Button>
//               <Button type="submit" disabled={loading}>
//                 {loading ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Creating...
//                   </>
//                 ) : (
//                   "Create Project"
//                 )}
//               </Button>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }


import { CreateProjectForm } from "../../../components/forms/create-project-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CreateProjectForm />
      </div>
    </div>
  )
}
