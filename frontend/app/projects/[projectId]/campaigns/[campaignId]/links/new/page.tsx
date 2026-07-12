// "use client"

// import { useState } from "react"
// import { useParams, useRouter } from "next/navigation"
// import { ArrowLeft } from "lucide-react"
// import Link from "next/link"
// import { useProjectStore } from "@/stores/useProjectStore"

// export default function NewLinkPage() {
//   const params = useParams()
//   const router = useRouter()
//   const projectId = params.projectId as string
//   const campaignId = params.campaignId as string

//   const { createLink, loading } = useProjectStore()
//   const [title, setTitle] = useState("")
//   const [error, setError] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")

//     if (!title.trim()) {
//       setError("Link title is required")
//       return
//     }

//     try {
//       await createLink({
//         project_id: projectId,
//         campaign_id: campaignId,
//         title,
//       })
//       router.push(`/projects/${projectId}/campaigns/${campaignId}`)
//     } catch (err) {
//       setError("Failed to create link. Please try again.")
//       console.error(err)
//     }
//   }

//   return (
//     <div className="content-wrapper">
//       <div className="mb-8">
//         <Link
//           href={`/projects/${projectId}/campaigns/${campaignId}`}
//           className="btn btn-ghost mb-4 gap-2"
//         >
//           <ArrowLeft size={20} />
//           Back to Campaign
//         </Link>
//         <h1 className="text-4xl font-bold tracking-[-0.10rem]">
//           Add Manual Link
//         </h1>
//         <p className="text-base-content mt-2 opacity-70">
//           Create a custom tracking link for this campaign
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
//                   <span className="label-text font-semibold">Link Title *</span>
//                 </label>
//                 <input
//                   type="text"
//                   placeholder="e.g., Instagram Story Link"
//                   className="input input-bordered"
//                   value={title}
//                   onChange={(e) => setTitle(e.target.value)}
//                   required
//                 />
//                 <label className="label">
//                   <span className="label-text-alt">
//                     A descriptive name to identify this tracking link
//                   </span>
//                 </label>
//               </div>

//               <div className="card-actions justify-end pt-4">
//                 <Link
//                   href={`/projects/${projectId}/campaigns/${campaignId}`}
//                   className="btn btn-ghost"
//                 >
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
//                     "Create Link"
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

// export default function NewLinkPage() {
//   const params = useParams()
//   const router = useRouter()
//   const projectId = params.projectId as string
//   const campaignId = params.campaignId as string

//   const { createLink, loading } = useProjectStore()
//   const [title, setTitle] = useState("")
//   const [error, setError] = useState("")

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError("")

//     if (!title.trim()) {
//       setError("Link title is required")
//       return
//     }

//     try {
//       await createLink({
//         project_id: projectId,
//         campaign_id: campaignId,
//         title,
//       })
//       router.push(`/projects/${projectId}/campaigns/${campaignId}`)
//     } catch (err) {
//       setError("Failed to create link. Please try again.")
//       console.error(err)
//     }
//   }

//   return (
//     <div className="container max-w-2xl py-6 lg:py-10">
//       <div className="mb-8 space-y-4">
//         <Button
//           asChild
//           variant="ghost"
//           size="sm"
//           className="gap-2"
//         >
//           <Link href={`/projects/${projectId}/campaigns/${campaignId}`}>
//             <ArrowLeft size={16} />
//             Back to Campaign
//           </Link>
//         </Button>
//         <div>
//           <h1 className="text-4xl font-bold tracking-tight">
//             Add Manual Link
//           </h1>
//           <p className="text-muted-foreground mt-2">
//             Create a custom tracking link for this campaign
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
//                 Link Title <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="title"
//                 type="text"
//                 placeholder="e.g., Instagram Story Link"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 required
//               />
//               <p className="text-[0.8rem] text-muted-foreground">
//                 A descriptive name to identify this tracking link
//               </p>
//             </div>

//             <div className="flex items-center justify-end gap-4 pt-4 border-t">
//               <Button asChild variant="ghost">
//                 <Link href={`/projects/${projectId}/campaigns/${campaignId}`}>
//                   Cancel
//                 </Link>
//               </Button>
//               <Button
//                 type="submit"
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Creating...
//                   </>
//                 ) : (
//                   "Create Link"
//                 )}
//               </Button>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }


import { CreateLinkForm } from "../../../../../../../components/forms/create-link-form"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CreateLinkForm />
      </div>
    </div>
  )
}
