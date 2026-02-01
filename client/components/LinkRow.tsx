"use client";

import Link from "next/link";
import { Copy, BarChart, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { Link as LinkType } from "@/lib/types";

interface LinkRowProps {
  link: LinkType;
  projectId: string;
  campaignId: string;
}

export default function LinkRow({ link, projectId, campaignId }: LinkRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.customUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <tr className="hover">
      <td>
        <div className="flex items-center gap-2">
          <div
            className={`badge ${link.isActive ? "badge-success" : "badge-error"}`}
          >
            {link.isActive ? "Active" : "Inactive"}
          </div>
          <span className="font-medium">{link.title}</span>
        </div>
      </td>
      <td>
        <span className="badge badge-outline">{link.platform}</span>
      </td>
      <td>
        <code className="bg-base-200 px-2 py-1 rounded text-sm">
          {link.slug}
        </code>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <code className="text-sm truncate max-w-xs">{link.customUrl}</code>
          <button
            onClick={handleCopy}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="Copy URL"
          >
            {copied ? (
              <CheckCircle size={14} className="text-success" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </td>
      <td>
        <span className="font-semibold text-primary">
          {formatNumber(link.clickCount)}
        </span>
      </td>
      <td>
        <Link
          href={`/projects/${projectId}/campaigns/${campaignId}/links/${link.slug}`}
          className="btn btn-sm btn-ghost gap-2"
        >
          <BarChart size={14} />
          Stats
        </Link>
      </td>
    </tr>
  );
}
