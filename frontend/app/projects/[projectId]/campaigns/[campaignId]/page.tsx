"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Edit, Loader2 } from "lucide-react"
import { useProjectStore } from "@/stores/useProjectStore"
import LinkRow from "@/components/LinkRow"
import * as api from "@/lib/api"
import type { Campaign } from "@/lib/types"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CampaignDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const campaignId = params.campaignId as string

  const { links, fetchLinks, loading } = useProjectStore()
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    if (campaignId) {
      fetchLinks(campaignId)
      loadCampaign()
    }
  }, [campaignId, fetchLinks])

  const loadCampaign = async () => {
    try {
      const data = await api.getCampaign(campaignId)
      setCampaign(data)
    } catch (err) {
      console.error("Failed to load campaign:", err)
    }
  }

  return (
    <div className="content-wrapper space-y-8 p-6 sm:p-8 lg:p-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-2">
          <Link href={`/projects/${projectId}`}>
            <div className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Project
            </div>
          </Link>
        </Button>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              {campaign?.title || "Campaign"}
            </h1>

            {campaign?.url && (
              <a
                href={campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {campaign.url}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Tracking Links
        </h2>
        <Button
          asChild
          size="sm"
          className="w-full gap-2 sm:w-auto"
          variant="default"
        >
          <Link
            href={`/projects/${projectId}/campaigns/${campaignId}/links/new`}
          >
            <div className="gap-1.5 flex items-center">
              <span>Add Manual Link</span>
              <Plus size={16} />
            </div>
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : links.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-2">
            <h3 className="text-xl font-semibold">No links yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first tracking link to this campaign
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Short URL</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <LinkRow
                  key={link._id}
                  link={link}
                  projectId={projectId}
                  campaignId={campaignId}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}