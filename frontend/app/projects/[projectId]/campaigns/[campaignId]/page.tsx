"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Download,
  RefreshCw,
  MousePointer2,
  Zap,
  Trophy,
  Link2,
} from "lucide-react"
import LinkRow from "@/components/LinkRow"
import * as api from "@/lib/api"
import type {
  Campaign,
  CampaignPerformance,
  PerformanceWindow,
} from "@/lib/types"
import { platformName } from "@/lib/platforms"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const periods: PerformanceWindow[] = ["24h", "7d", "30d"]
const hours = { "24h": 24, "7d": 168, "30d": 720 }
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

export default function CampaignDetailPage() {
  const { projectId, campaignId } = useParams<{
    projectId: string
    campaignId: string
  }>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [range, setRange] = useState<PerformanceWindow>("24h")
  const [result, setResult] = useState<{
    campaignId: string
    data: CampaignPerformance
  } | null>(null)
  const [requestState, setRequestState] = useState<{
    key: string
    error: string | null
  } | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("clicks")

  const requestKey = `${campaignId}:${range}:${refresh}`
  const loading = requestState?.key !== requestKey
  const error = requestState?.key === requestKey ? requestState.error : null

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    Promise.all([
      api.getCampaign(campaignId),
      api.getCampaignPerformance(campaignId, range, controller.signal),
    ])
      .then(([details, data]) => {
        if (!cancelled) {
          setCampaign(details)
          setResult({ campaignId, data })
          setRequestState({ key: requestKey, error: null })
        }
      })
      .catch(() => {
        if (!cancelled)
          setRequestState({
            key: requestKey,
            error: "Could not load campaign analytics. Please try again.",
          })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [campaignId, range, requestKey])

  const data =
    result?.campaignId === campaignId && result.data.window === range
      ? result.data
      : null
  const links = data?.links ?? []
  const total = links.reduce((sum, link) => sum + link.performance.clicks, 0)
  const previous = links.reduce(
    (sum, link) => sum + link.performance.previousClicks,
    0
  )
  const leader = [...links].sort(
    (a, b) => b.performance.clicks - a.performance.clicks
  )[0]
  const query = search.trim().toLowerCase()
  const visible = links
    .filter((link) => {
      return (
        `${platformName(link.platform)} ${link.title} ${link.customUrl}`
          .toLowerCase()
          .includes(query) &&
        (status === "all" || link.isActive === (status === "active"))
      )
    })
    .sort((a, b) =>
      sort === "platform"
        ? platformName(a.platform).localeCompare(platformName(b.platform))
        : sort === "growth"
          ? b.performance.clicks -
            b.performance.previousClicks -
            (a.performance.clicks - a.performance.previousClicks)
          : b.performance.clicks - a.performance.clicks ||
            platformName(a.platform).localeCompare(platformName(b.platform))
    )

  const exportCsv = () => {
    // Quoting alone does not prevent a spreadsheet from interpreting a cell as a formula.
    const cell = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`
    const rows = [
      [
        "Platform",
        "Title",
        "Short URL",
        "Status",
        "Period",
        "From",
        "To",
        "Human clicks",
        "Previous period clicks",
        "Clicks per hour",
        "Share %",
      ],
      ...visible.map((link) => [
        platformName(link.platform),
        link.title,
        link.customUrl,
        link.isActive ? "Active" : "Paused",
        range,
        data!.start,
        data!.end,
        link.performance.clicks,
        link.performance.previousClicks,
        link.performance.clicksPerHour,
        link.performance.sharePercent,
      ]),
    ]
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF", rows.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8;" }
      )
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `campaign-${campaignId}-${range}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="content-wrapper space-y-7 p-4 sm:p-8 lg:p-10">
      <div>
        <Button
          render={<Link href={`/projects/${projectId}`} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="mb-5 -ml-2 gap-2 text-muted-foreground"
        >
          <ArrowLeft size={14} /> Back to project
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Campaign overview
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {campaign?._id === campaignId ? campaign.title : "Campaign"}
            </h1>
            {campaign?._id === campaignId && (
              <a
                href={campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm break-all text-muted-foreground hover:text-foreground"
              >
                {campaign.url}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            )}
          </div>
          <Button
            render={
              <Link
                href={`/projects/${projectId}/campaigns/${campaignId}/links/new`}
              />
            }
            nativeButton={false}
            className="gap-2"
          >
            <Plus className="size-4" /> Add tracking link
          </Button>
        </div>
      </div>

      <Tabs
        value={range}
        onValueChange={(value) => setRange(value as PerformanceWindow)}
        className="gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Analytics period" className="period-tabs">
            {periods.map((period) => (
              <TabsTrigger key={period} value={period}>
                {period === "24h"
                  ? "Last 24 hours"
                  : period === "7d"
                    ? "7 days"
                    : "30 days"}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {loading
                ? "Updating analytics…"
                : data
                  ? `Updated ${new Date(data.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : "Analytics unavailable"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh analytics"
              title="Refresh analytics"
              disabled={loading}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw
                className={loading ? "size-3.5 animate-spin" : "size-3.5"}
              />
            </Button>
          </div>
        </div>
        <TabsContent value={range} className="space-y-6" aria-busy={loading}>
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
              <Button
                variant="outline"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Retry
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Human clicks",
                value: data ? total.toLocaleString() : "—",
                detail: data
                  ? `${previous.toLocaleString()} in the previous period`
                  : "Waiting for analytics",
                icon: MousePointer2,
              },
              {
                label: "Average click velocity",
                value: data ? `${number.format(total / hours[range])}/hr` : "—",
                detail: "Across all campaign links",
                icon: Zap,
              },
              {
                label: "Top platform",
                value: total && leader ? platformName(leader.platform) : "—",
                detail:
                  total && leader
                    ? `${number.format(leader.performance.sharePercent)}% of campaign clicks`
                    : "Your first clicks will show up here",
                icon: Trophy,
              },
              {
                label: "Active links",
                value: data
                  ? `${links.filter((link) => link.isActive).length}`
                  : "—",
                detail: data
                  ? `${links.length} tracking links in this campaign`
                  : "Waiting for links",
                icon: Link2,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="metric-card rounded-xl border bg-card p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {stat.label}
                  <stat.icon className="size-3.5 shrink-0" />
                </div>
                <div
                  key={`${range}-${stat.value}`}
                  className="t-digit-group mt-3 text-2xl font-semibold tracking-tight tabular-nums"
                >
                  <span className="t-digit">{stat.value}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>

          <section
            className="overflow-hidden rounded-xl border bg-card"
            aria-labelledby="tracking-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 id="tracking-title" className="text-base font-semibold">
                  Tracking links{" "}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {links.length}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  See which channels turn your content into clicks.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!visible.length || loading}
                onClick={exportCsv}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
              <div className="relative min-w-44 flex-1 sm:max-w-64">
                <Search className="pointer-events-none absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                <input
                  aria-label="Search tracking links"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search platforms or links…"
                  className="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <select
                aria-label="Filter link status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="table-select"
              >
                <option value="all">All links</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <select
                aria-label="Sort tracking links"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="table-select"
              >
                <option value="clicks">Most clicks</option>
                <option value="growth">Biggest click increase</option>
                <option value="platform">Platform A–Z</option>
              </select>
            </div>
            <Table className="tracking-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Platform</TableHead>
                  <TableHead>Tracking link</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead
                    className="text-right"
                    title="Share of all campaign clicks in the selected period"
                  >
                    Share
                  </TableHead>
                  <TableHead title="Average clicks per hour, relative to the fastest link in this campaign">
                    Click velocity
                  </TableHead>
                  <TableHead title="12 equal intervals, oldest to newest. Each row uses its own scale.">
                    Activity
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !data ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-52 text-center">
                      <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                      <span className="mt-3 block text-sm text-muted-foreground">
                        Loading tracking links…
                      </span>
                    </TableCell>
                  </TableRow>
                ) : visible.length ? (
                  visible.map((link) => (
                    <LinkRow
                      key={link._id}
                      link={link}
                      projectId={projectId}
                      campaignId={campaignId}
                      start={data!.start}
                      bucketMs={data!.bucketMs}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <p className="font-medium">
                        {error
                          ? "Analytics unavailable"
                          : links.length
                            ? "No matching links"
                            : "No tracking links yet"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {error
                          ? "Retry to load the latest data."
                          : links.length
                            ? "Try another search or status filter."
                            : "Add a tracking link to start measuring your content."}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex flex-wrap justify-between gap-2 border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground">
              <span>
                {visible.length} of {links.length} links ·{" "}
                {total.toLocaleString()} campaign clicks
              </span>
              <span>
                Detected bots excluded · Compared with previous {range}
              </span>
            </div>
          </section>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Velocity is the average clicks per hour over this period. A full
            meter marks the fastest link in this campaign. Activity shows 12
            equal time intervals, scaled per link. Share and velocity always
            compare all campaign links, even when filtered.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
