// "use client"

// import { useEffect, useState } from "react"
// import { useParams, useRouter } from "next/navigation"
// import Link from "next/link"
// import { ArrowLeft, Plus, Loader2 } from "lucide-react"
// import { useProjectStore } from "@/stores/useProjectStore"
// import CampaignCard from "@/components/CampaignCard"
// import * as api from "@/lib/api"
// import type { Campaign } from "@/lib/types"

// import { Button } from "@/components/ui/button"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card"
// import {
//   Table,
//   TableBody,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { toast } from "sonner"

// // Recharts Graph Primitives
// import {
//   PieChart,
//   Pie,
//   Cell,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts"

// export default function ProjectDetailPage() {
//   const params = useParams()
//   const router = useRouter()
//   const projectId = params.projectId as string
//   const [activeTab, setActiveTab] = useState<string>("campaigns")
//   const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
//   const [editFormData, setEditFormData] = useState({ title: "", url: "" })

//   const { campaigns, fetchCampaigns, updateCampaign, deleteCampaign, loading } =
//     useProjectStore()

//   // Analytics data
//   const [analytics, setAnalytics] = useState({
//     totalClicks: 0,
//     humanConfidence: 0,
//     devices: { mobile: 0, tablet: 0, desktop: 0 },
//     countries: [] as { country: string; count: number }[],
//   })

//   useEffect(() => {
//     if (projectId) {
//       fetchCampaigns(projectId)
//       loadAnalytics()
//     }
//   }, [projectId, fetchCampaigns])

//   const loadAnalytics = async () => {
//     try {
//       const [confidence, devices, countries] = await Promise.all([
//         api.getHumanConfidence(projectId),
//         api.getDeviceBreakdown(projectId),
//         api.getGlobalReach(projectId),
//       ])

//       const totalClicks = devices.mobile + devices.tablet + devices.desktop

//       setAnalytics({
//         totalClicks,
//         humanConfidence: confidence.confidence,
//         devices,
//         countries: countries.data.slice(0, 5),
//       })
//     } catch (err) {
//       toast.error("Oops! Something went wrong.", { description: "Having trouble loading analytics, please try again." })
//       console.error("Failed to load analytics:", err)
//     }
//   }

//   const handleEdit = (campaign: Campaign) => {
//     setEditingCampaign(campaign)
//     setEditFormData({ title: campaign.title, url: campaign.url })
//   }

//   const handleUpdateSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!editingCampaign) return

//     try {
//       await updateCampaign(editingCampaign._id, editFormData)
//       setEditingCampaign(null)
//       fetchCampaigns(projectId)
//     } catch (err) {
//       toast.error("Oops! Something went wrong.", { description: "There was an issue attempting to update the campaign, please try again." })
//       console.error("Failed to update campaign:", err)
//     }
//   }

//   const deviceChartData = [
//     { name: "Mobile", value: analytics.devices.mobile, color: "#0ea5e9" },
//     { name: "Tablet", value: analytics.devices.tablet, color: "#8b5cf6" },
//     { name: "Desktop", value: analytics.devices.desktop, color: "#10b981" },
//   ]

//   return (
//     <div className="container space-y-8 py-6 lg:py-10">
//       <div>
//         <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
//           <Link href="/">
//             <ArrowLeft size={16} />
//             Back to Projects
//           </Link>
//         </Button>
//         <h1 className="text-4xl font-bold tracking-tight">Project Details</h1>
//       </div>

//       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//         <TabsList className="mb-6 grid w-full max-w-[400px] grid-cols-2">
//           <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
//           <TabsTrigger value="analytics">Analytics</TabsTrigger>
//         </TabsList>

//         {/* --- Campaigns Content View --- */}
//         <TabsContent value="campaigns" className="space-y-6">
//           <div className="flex items-center justify-between">
//             <h2 className="text-2xl font-semibold tracking-tight">Campaigns</h2>
//             <Button asChild size="sm" className="flex gap-2">
//               <Link href={`/projects/${projectId}/campaigns/new`}>
//                 Create Campaign
//               </Link>
//             </Button>
//           </div>

//           {loading ? (
//             <div className="flex items-center justify-center py-12">
//               <Loader2 className="h-8 w-8 animate-spin text-primary" />
//             </div>
//           ) : campaigns.length === 0 ? (
//             <Card className="py-16 text-center">
//               <CardContent className="space-y-2">
//                 <h3 className="text-xl font-semibold">No Campaigns Yet</h3>
//                 <p className="text-sm text-muted-foreground">
//                   Create your first campaign to start tracking links.
//                 </p>
//               </CardContent>
//             </Card>
//           ) : (
//             <div className="rounded-md border bg-card">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Campaign</TableHead>
//                     <TableHead>URL</TableHead>
//                     <TableHead>Links</TableHead>
//                     <TableHead className="w-[100px]">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {campaigns.map((campaign) => (
//                     <CampaignCard
//                       key={campaign._id}
//                       campaign={campaign}
//                       projectId={projectId}
//                       linkCount={9}
//                       onEdit={handleEdit}
//                       onDelete={deleteCampaign}
//                     />
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           )}
//         </TabsContent>

//         {/* --- Analytics Content View --- */}
//         <TabsContent value="analytics" className="space-y-8">
//           <h2 className="text-2xl font-semibold tracking-tight">
//             Analytics Overview
//           </h2>

//           <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardDescription className="text-sm font-medium">
//                   Total Clicks
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="text-3xl font-bold text-primary">
//                   {analytics.totalClicks.toLocaleString()}
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardDescription className="text-sm font-medium">
//                   Human Confidence
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="text-3xl font-bold text-emerald-500">
//                   {(analytics.humanConfidence * 100).toFixed(1)}%
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//             <Card>
//               <CardHeader>
//                 <CardTitle className="text-base font-semibold">
//                   Device Breakdown
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="h-[300px] w-full">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <PieChart>
//                       <Pie
//                         data={deviceChartData}
//                         cx="50%"
//                         cy="50%"
//                         outerRadius={100}
//                         dataKey="value"
//                         label
//                       >
//                         {deviceChartData.map((entry, index) => (
//                           <Cell key={`cell-${index}`} fill={entry.color} />
//                         ))}
//                       </Pie>
//                       <Tooltip />
//                     </PieChart>
//                   </ResponsiveContainer>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle className="text-base font-semibold">
//                   Top Countries
//                 </CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="h-[300px] w-full">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <BarChart data={analytics.countries}>
//                       <XAxis
//                         dataKey="country"
//                         stroke="#888888"
//                         fontSize={12}
//                         tickLine={false}
//                         axisLine={false}
//                       />
//                       <YAxis
//                         stroke="#888888"
//                         fontSize={12}
//                         tickLine={false}
//                         axisLine={false}
//                       />
//                       <Tooltip />
//                       <Bar
//                         dataKey="count"
//                         fill="#0ea5e9"
//                         radius={[4, 4, 0, 0]}
//                       />
//                     </BarChart>
//                   </ResponsiveContainer>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>
//       </Tabs>

//       {/* --- Edit Modal Dialog --- */}
//       <Dialog
//         open={!!editingCampaign}
//         onOpenChange={(open) => !open && setEditingCampaign(null)}
//       >
//         <DialogContent className="sm:max-w-[425px]">
//           <DialogHeader>
//             <DialogTitle>Edit Campaign</DialogTitle>
//           </DialogHeader>
//           <form onSubmit={handleUpdateSubmit} className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="title">Title</Label>
//               <Input
//                 id="title"
//                 type="text"
//                 value={editFormData.title}
//                 onChange={(e) =>
//                   setEditFormData({ ...editFormData, title: e.target.value })
//                 }
//                 required
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="url">URL</Label>
//               <Input
//                 id="url"
//                 type="url"
//                 value={editFormData.url}
//                 onChange={(e) =>
//                   setEditFormData({ ...editFormData, url: e.target.value })
//                 }
//                 required
//               />
//             </div>

//             <DialogFooter className="pt-4">
//               <Button
//                 type="button"
//                 variant="ghost"
//                 onClick={() => setEditingCampaign(null)}
//               >
//                 Cancel
//               </Button>
//               <Button type="submit">Save Changes</Button>
//             </DialogFooter>
//           </form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Loader2 } from "lucide-react"
import { useProjectStore } from "@/stores/useProjectStore"
import CampaignCard from "@/components/CampaignCard"
import * as api from "@/lib/api"
import type { Campaign } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// Recharts Graph Primitives
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const [activeTab, setActiveTab] = useState<string>("campaigns")
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [editFormData, setEditFormData] = useState({ title: "", url: "" })

  const { campaigns, fetchCampaigns, updateCampaign, deleteCampaign, loading } =
    useProjectStore()

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalClicks: 0,
    humanConfidence: 0,
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    countries: [] as { country: string; count: number }[],
  })

  useEffect(() => {
    if (projectId) {
      fetchCampaigns(projectId)
      loadAnalytics()
    }
  }, [projectId, fetchCampaigns])

  const loadAnalytics = async () => {
    try {
      const [confidence, devices, countries] = await Promise.all([
        api.getHumanConfidence(projectId),
        api.getDeviceBreakdown(projectId),
        api.getGlobalReach(projectId),
      ])

      const totalClicks = devices.mobile + devices.tablet + devices.desktop

      setAnalytics({
        totalClicks,
        humanConfidence: confidence.confidence,
        devices,
        countries: countries.data.slice(0, 5),
      })
    } catch (err) {
      toast.error("Oops! Something went wrong.", {
        description: "Having trouble loading analytics, please try again.",
      })
      console.error("Failed to load analytics:", err)
    }
  }

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setEditFormData({ title: campaign.title, url: campaign.url })
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCampaign) return

    try {
      await updateCampaign(editingCampaign._id, editFormData)
      setEditingCampaign(null)
      fetchCampaigns(projectId)
    } catch (err) {
      toast.error("Oops! Something went wrong.", {
        description:
          "There was an issue attempting to update the campaign, please try again.",
      })
      console.error("Failed to update campaign:", err)
    }
  }

  const deviceChartData = [
    { name: "Mobile", value: analytics.devices.mobile, color: "#0ea5e9" },
    { name: "Tablet", value: analytics.devices.tablet, color: "#8b5cf6" },
    { name: "Desktop", value: analytics.devices.desktop, color: "#10b981" },
  ]

  return (
    <div className="content-wrapper space-y-8 p-6 sm:p-8 lg:p-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
          <Link href="/">
            <div className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span>Back to Projects</span>
            </div>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Project Details
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* --- Campaigns Content View --- */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold tracking-tighter">Campaigns</h2>
            <Button asChild size="sm" className="flex w-full gap-2 sm:w-auto">
              <Link href={`/projects/${projectId}/campaigns/new`}>
                <div className="flex items-center gap-1.5">
                  <span>Create Campaign</span>
                  <Plus size={16} />
                </div>
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="py-16 text-center">
              <CardContent className="space-y-2">
                <h3 className="text-xl font-semibold">No Campaigns Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first campaign to start tracking links.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Links</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign._id}
                      campaign={campaign}
                      projectId={projectId}
                      linkCount={9}
                      onEdit={handleEdit}
                      onDelete={deleteCampaign}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* --- Analytics Content View --- */}
        <TabsContent value="analytics" className="space-y-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Analytics Overview
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-sm font-medium">
                  Total Clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {analytics.totalClicks.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-sm font-medium">
                  Human Confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">
                  {(analytics.humanConfidence * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Device Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label
                      >
                        {deviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.countries}>
                      <XAxis
                        dataKey="country"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- Edit Modal Dialog --- */}
      <Dialog
        open={!!editingCampaign}
        onOpenChange={(open) => !open && setEditingCampaign(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={editFormData.url}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, url: e.target.value })
                }
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingCampaign(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}