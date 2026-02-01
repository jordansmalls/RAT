"use client";

import Link from "next/link";
import { Edit, Trash2, ExternalLink, Link as LinkIcon } from "lucide-react";
import type { Campaign } from "@/lib/types";

interface CampaignCardProps {
  campaign: Campaign;
  projectId: string;
  linkCount: number;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
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
    }).format(new Date(dateString));
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Delete campaign "${campaign.title}"? This will also delete all associated links.`,
      )
    ) {
      onDelete(campaign._id);
    }
  };

  return (
    <tr className="hover">
      <td>
        <div className="font-semibold">{campaign.title}</div>
        <div className="text-sm opacity-60">
          {formatDate(campaign.createdAt)}
        </div>
      </td>
      <td>
        <a
          href={campaign.url}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary flex items-center gap-1 max-w-md truncate"
        >
          {campaign.url}
          <ExternalLink size={12} />
        </a>
      </td>
      <td>
        <div className="badge badge-primary badge-lg gap-2">
          <LinkIcon size={14} />
          {linkCount}
        </div>
      </td>
      <td>
        <div className="flex gap-2">
          <Link
            href={`/projects/${projectId}/campaigns/${campaign._id}`}
            className="btn btn-sm btn-ghost"
          >
            View
          </Link>
          <button
            onClick={() => onEdit(campaign)}
            className="btn btn-sm btn-ghost"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-sm btn-ghost text-error"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
