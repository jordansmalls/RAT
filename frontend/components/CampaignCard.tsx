// "use client"

// import Link from "next/link"
// import { Edit, Trash2, ExternalLink, Link as LinkIcon } from "lucide-react"
// import type { Campaign } from "@/lib/types"

// interface CampaignCardProps {
//   campaign: Campaign
//   projectId: string
//   linkCount: number
//   onEdit: (campaign: Campaign) => void
//   onDelete: (id: string) => void
// }

// export default function CampaignCard({
//   campaign,
//   projectId,
//   linkCount,
//   onEdit,
//   onDelete,
// }: CampaignCardProps) {
//   const formatDate = (dateString: string) => {
//     return new Intl.DateTimeFormat("en-US", {
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     }).format(new Date(dateString))
//   }

//   const handleDelete = () => {
//     if (
//       window.confirm(
//         `Delete campaign "${campaign.title}"? This will also delete all associated links.`
//       )
//     ) {
//       onDelete(campaign._id)
//     }
//   }

//   return (
//     <tr className="hover">
//       <td>
//         <div className="font-semibold">{campaign.title}</div>
//         <div className="text-sm opacity-60">
//           {formatDate(campaign.createdAt)}
//         </div>
//       </td>
//       <td>
//         <a
//           href={campaign.url}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="link link-primary flex max-w-md items-center gap-1 truncate"
//         >
//           {campaign.url}
//           <ExternalLink size={12} />
//         </a>
//       </td>
//       <td>
//         <div className="badge badge-primary badge-lg gap-2">
//           <LinkIcon size={14} />
//           {linkCount}
//         </div>
//       </td>
//       <td>
//         <div className="flex gap-2">
//           <Link
//             href={`/projects/${projectId}/campaigns/${campaign._id}`}
//             className="btn btn-sm btn-ghost"
//           >
//             View
//           </Link>
//           <button
//             onClick={() => onEdit(campaign)}
//             className="btn btn-sm btn-ghost"
//           >
//             <Edit size={16} />
//           </button>
//           <button
//             onClick={handleDelete}
//             className="btn btn-sm btn-ghost text-error"
//           >
//             <Trash2 size={16} />
//           </button>
//         </div>
//       </td>
//     </tr>
//   )
// }

"use client"

import Link from "next/link"
import { Edit, Trash2, ExternalLink, Link as LinkIcon } from "lucide-react"
import type { Campaign } from "@/lib/types"
import { TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CampaignCardProps {
  campaign: Campaign
  projectId: string
  linkCount: number
  onEdit: (campaign: Campaign) => void
  onDelete: (id: string) => void
}

export default function CampaignCard({
  campaign,
  projectId,
  linkCount,
  onEdit,
  onDelete,
}: CampaignCardProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Delete campaign "${campaign.title}"? This will also delete all associated links.`
      )
    ) {
      onDelete(campaign._id)
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-semibold text-foreground">{campaign.title}</div>
        <div className="text-sm text-muted-foreground">
          {formatDate(campaign.createdAt)}
        </div>
      </TableCell>
      <TableCell>
        <a
          href={campaign.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-md items-center gap-1 truncate font-medium text-primary hover:underline"
        >
          {campaign.url}
          <ExternalLink size={12} className="shrink-0" />
        </a>
      </TableCell>
      <TableCell>
        <Badge
          variant="default"
          className="gap-1.5 px-2.5 py-1 text-sm font-medium"
        >
          <LinkIcon size={14} />
          {linkCount}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}/campaigns/${campaign._id}`}>
              View
            </Link>
          </Button>
          <Button
            onClick={() => onEdit(campaign)}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <Edit size={16} />
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}