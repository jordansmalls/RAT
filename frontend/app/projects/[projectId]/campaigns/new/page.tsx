// "use client"

// import { useState } from "react"
// import { useParams, useRouter } from "next/navigation"
// import { ArrowLeft } from "lucide-react"
// import Link from "next/link"
// import { useProjectStore } from "@/stores/useProjectStore"

// export default function NewCampaignPage() {
//   const params = useParams()
//   const router = useRouter()
//   const projectId = params.projectId as string
//   const { createCampaign, loading } = useProjectStore()

//   const [formData, setFormData] = useState({
//     title: "",
//     url: "",
//   })
//   const [error, setError] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")

//     if (!formData.title.trim() || !formData.url.trim()) {
//       setError("All fields are required")
//       return
//     }

//     try {
//       await createCampaign({
//         project_id: projectId,
//         title: formData.title,
//         url: formData.url,
//       })
//       router.push(`/projects/${projectId}`)
//     } catch (err) {
//       setError("Failed to create campaign. Please try again.")
//       console.error(err)
//     }
//   }

//   return (
//     <div className="content-wrapper">
//       <div className="mb-8">
//         <Link
//           href={`/projects/${projectId}`}
//           className="btn btn-ghost mb-4 gap-2"
//         >
//           <ArrowLeft size={20} />
//           Back to Project
//         </Link>
//         <h1 className="text-4xl font-bold">Create New Campaign</h1>
//         <p className="text-base-content mt-2 opacity-70">
//           Add a new campaign with tracking links
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
//                     Campaign Title *
//                   </span>
//                 </label>
//                 <input
//                   type="text"
//                   placeholder="e.g., Summer Sale 2024"
//                   className="input input-bordered"
//                   value={formData.title}
//                   onChange={(e) =>
//                     setFormData({ ...formData, title: e.target.value })
//                   }
//                   required
//                 />
//               </div>

//               <div className="form-control">
//                 <label className="label">
//                   <span className="label-text font-semibold">
//                     Campaign URL *
//                   </span>
//                 </label>
//                 <input
//                   type="url"
//                   placeholder="https://example.com/campaign"
//                   className="input input-bordered"
//                   value={formData.url}
//                   onChange={(e) =>
//                     setFormData({ ...formData, url: e.target.value })
//                   }
//                   required
//                 />
//                 <label className="label">
//                   <span className="label-text-alt">
//                     This will be used to generate tracking links for different
//                     platforms
//                   </span>
//                 </label>
//               </div>

//               <div className="card-actions justify-end pt-4">
//                 <Link href={`/projects/${projectId}`} className="btn btn-ghost">
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
//                     "Create Campaign"
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


// ! 1st attempt
// "use client"

// import { useState } from "react"
// import { useParams, useRouter } from "next/navigation"
// import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
// import Link from "next/link"
// import { useProjectStore } from "@/stores/useProjectStore"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Card, CardContent } from "@/components/ui/card"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// export default function NewCampaignPage() {
//   const params = useParams()
//   const router = useRouter()
//   const projectId = params.projectId as string
//   const { createCampaign, loading } = useProjectStore()

//   const [formData, setFormData] = useState({
//     title: "",
//     url: "",
//   })
//   const [error, setError] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")

//     if (!formData.title.trim() || !formData.url.trim()) {
//       setError("All fields are required")
//       return
//     }

//     try {
//       await createCampaign({
//         project_id: projectId,
//         title: formData.title,
//         url: formData.url,
//       })
//       router.push(`/projects/${projectId}`)
//     } catch (err) {
//       setError("Failed to create campaign. Please try again.")
//       console.error(err)
//     }
//   }

//   return (
//     <div className="container max-w-2xl py-6 lg:py-10">
//       <div className="mb-8 space-y-4">
//         <Button asChild variant="ghost" size="sm" className="gap-2">
//           <Link href={`/projects/${projectId}`}>
//             <ArrowLeft size={16} />
//             Back to Project
//           </Link>
//         </Button>
//         <div>
//           <h1 className="text-4xl font-bold tracking-tight">
//             Create New Campaign
//           </h1>
//           <p className="mt-2 text-muted-foreground">
//             Add a new campaign with tracking links
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
//               <Label htmlFor="title" className="font-semibold">
//                 Campaign Title <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="title"
//                 type="text"
//                 placeholder="e.g., Summer Sale 2024"
//                 value={formData.title}
//                 onChange={(e) =>
//                   setFormData({ ...formData, title: e.target.value })
//                 }
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="url" className="font-semibold">
//                 Campaign URL <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="url"
//                 type="url"
//                 placeholder="https://example.com/campaign"
//                 value={formData.url}
//                 onChange={(e) =>
//                   setFormData({ ...formData, url: e.target.value })
//                 }
//                 required
//               />
//               <p className="text-[0.8rem] text-muted-foreground">
//                 This will be used to generate tracking links for different
//                 platforms
//               </p>
//             </div>

//             <div className="flex items-center justify-end gap-4 border-t pt-4">
//               <Button asChild variant="ghost">
//                 <Link href={`/projects/${projectId}`}>Cancel</Link>
//               </Button>
//               <Button type="submit" disabled={loading}>
//                 {loading ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Creating...
//                   </>
//                 ) : (
//                   "Create Campaign"
//                 )}
//               </Button>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

import { CreateCampaignForm } from "../../../../../components/forms/create-campaign-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CreateCampaignForm />
      </div>
    </div>
  )
}
