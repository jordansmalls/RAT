// "use client"

// import Link from "next/link"
// import { Copy, BarChart, CheckCircle } from "lucide-react"
// import { useState } from "react"
// import type { Link as LinkType } from "@/lib/types"
// import { TableRow, TableCell } from "@/components/ui/table"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { cn } from "../lib/utils"
// import { toast } from "sonner"

// interface LinkRowProps {
//   link: LinkType
//   projectId: string
//   campaignId: string
// }

// export default function LinkRow({ link, projectId, campaignId }: LinkRowProps) {
//   const [copied, setCopied] = useState(false)

//   const handleCopy = async () => {
//     try {
//       await navigator.clipboard.writeText(link.customUrl)
//       setCopied(true)
//       setTimeout(() => setCopied(false), 2000)
//     } catch (err) {
//       toast.error("Oops! Something went wrong.", {
//         description: "Failed to copy to clipboard, please try again.",
//       })
//       console.error("Failed to copy:", err)
//     }
//   }

//   // change color of badge background based on name, text should be white on all.

//   if (link.title == "youtube") {
//     // bg-[##FF0000]
//   }

//   // tiktok - #25F4EE
//   // twitter - #1DA1F2
//   // instagram - #5851DB
//   // facebook - #0165E1
//   // threads - #000000
//   // reddit - #FF5700
//   // linkedin - #0077B5
//   // twitch - #6441a5
//   // pinterest - #E60023

//   const formatNumber = (num: number) => {
//     return new Intl.NumberFormat("en-US").format(num)
//   }

//   return (
//     <TableRow>
//       <TableCell>
//         <div className="flex items-center gap-2">
//           <span className="font-medium text-foreground">
//             {link.title[0].toUpperCase() + link.title.slice(1)}
//           </span>
//           <Badge
//             variant={link.isActive ? "success" : "destructive"}
//             className={cn(
//               "font-medium",
//               link.isActive &&
//                 "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 dark:bg-emerald-500/20"
//             )}
//           >
//             {link.isActive ? "active" : "inactive"}
//           </Badge>
//           {/* <span className="font-medium text-foreground">{link.title[0].toUpperCase() + link.title.slice(1)}</span> */}
//         </div>
//       </TableCell>

//       <TableCell>
//         <Badge variant="outline" className="font-normal">
//           {link.platform}
//         </Badge>
//       </TableCell>

//       <TableCell>
//         <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
//           {link.slug}
//         </code>
//       </TableCell>

//       <TableCell>
//         <div className="flex items-center gap-2">
//           <code className="max-w-xs truncate font-mono text-sm text-muted-foreground">
//             {link.customUrl}
//           </code>
//           <Button
//             onClick={handleCopy}
//             variant="ghost"
//             size="icon"
//             className="h-6 w-6 rounded-full"
//             aria-label="Copy URL"
//           >
//             {copied ? (
//               <CheckCircle size={14} className="text-emerald-500" />
//             ) : (
//               <Copy size={14} className="text-muted-foreground" />
//             )}
//           </Button>
//         </div>
//       </TableCell>

//       <TableCell>
//         <span className="font-semibold text-primary">
//           {formatNumber(link.clickCount)}
//         </span>
//       </TableCell>

//       <TableCell>
//         <Button asChild variant="ghost" size="sm" className="gap-2">
//           <Link
//             href={`/projects/${projectId}/campaigns/${campaignId}/links/${link.slug}`}
//           >
//             <div className="flex items-center gap-1.5">
//               <BarChart size={14} />
//               <span>Stats</span>
//             </div>
//           </Link>
//         </Button>
//       </TableCell>
//     </TableRow>
//   )
// }

"use client"

import Link from "next/link"
import { Copy, BarChart, CheckCircle } from "lucide-react"
import { useState } from "react"
import type { Link as LinkType } from "@/lib/types"
import { TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "../lib/utils"
import { toast } from "sonner"

interface LinkRowProps {
  link: LinkType
  projectId: string
  campaignId: string
}

// Platform brand colors — badge text is always white on top of these.
const PLATFORM_COLORS: Record<string, string> = {
  youtube: "#FF0000",
  tiktok: "#ff0050",
  twitter: "#1DA1F2",
  instagram: "#5851DB",
  facebook: "#0165E1",
  threads: "#000000",
  reddit: "#FF5700",
  linkedin: "#0077B5",
  twitch: "#6441A5",
  pinterest: "#E60023",
}

export default function LinkRow({ link, projectId, campaignId }: LinkRowProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.customUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Oops! Something went wrong.", {
        description: "Failed to copy to clipboard, please try again.",
      })
      console.error("Failed to copy:", err)
    }
  }

  const platformColor = PLATFORM_COLORS[link.platform?.toLowerCase()]

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {link.title[0].toUpperCase() + link.title.slice(1)}
          </span>
          <Badge
            variant={link.isActive ? "success" : "destructive"}
            className={cn(
              "font-medium",
              link.isActive &&
                "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 dark:bg-emerald-500/20"
            )}
          >
            {link.isActive ? "active" : "inactive"}
          </Badge>
        </div>
      </TableCell>

      <TableCell>
        <Badge
          variant={platformColor ? undefined : "outline"}
          className={cn(
            "font-normal",
            platformColor && "border-transparent text-white hover:opacity-90"
          )}
          style={platformColor ? { backgroundColor: platformColor } : undefined}
        >
          {link.platform}
        </Badge>
      </TableCell>

      <TableCell>
        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
          {link.slug}
        </code>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <code className="max-w-xs truncate font-mono text-sm text-muted-foreground">
            {link.customUrl}
          </code>
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            aria-label="Copy URL"
          >
            {copied ? (
              <CheckCircle size={14} className="text-emerald-500" />
            ) : (
              <Copy size={14} className="text-muted-foreground" />
            )}
          </Button>
        </div>
      </TableCell>

      <TableCell>
        <span className="font-semibold text-primary">
          {formatNumber(link.clickCount)}
        </span>
      </TableCell>

      <TableCell>
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link
            href={`/projects/${projectId}/campaigns/${campaignId}/links/${link.slug}`}
          >
            <div className="flex items-center gap-1.5">
              <BarChart size={14} />
              <span>Stats</span>
            </div>
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}