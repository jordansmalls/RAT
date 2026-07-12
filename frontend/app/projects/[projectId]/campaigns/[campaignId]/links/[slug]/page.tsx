"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Loader2 } from "lucide-react"
import * as api from "@/lib/api"

// shadcn/ui Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

// Recharts Components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export default function LinkAnalyticsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const campaignId = params.campaignId as string
  const slug = params.slug as string

  const [analytics, setAnalytics] = useState({
    countries: [] as { country: string; count: number }[],
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    recentActivity: [] as any[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [projectId, campaignId, slug])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const links = await api.getLinks(campaignId)
      const link = links.find((candidate) => candidate.slug === slug)

      if (!link) {
        throw new Error(`Unable to find link for slug: ${slug}`)
      }

      const [countries, devices, activity] = await Promise.all([
        api.getGlobalReach(projectId, link._id),
        api.getDeviceBreakdown(projectId, link._id),
        api.getRecentActivity(projectId, link._id),
      ])

      setAnalytics({
        countries: countries.data.slice(0, 10),
        devices,
        recentActivity: activity.data.slice(0, 20),
      })
    } catch (err) {
      console.error("Failed to load analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: "json" | "csv") => {
    try {
      const blob = await api.downloadClicks(projectId, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `clicks-${projectId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Failed to export:", err)
    }
  }

  const clicksOverTime = Object.values(
    analytics.recentActivity.reduce(
      (
        clicksByDate: Record<
          string,
          { date: string; timestamp: number; clicks: number }
        >,
        click
      ) => {
        const date = new Date(click.clickedAt)
        const key = date.toISOString().slice(0, 10)
        const existing = clicksByDate[key]

        clicksByDate[key] = {
          date: date.toLocaleDateString(),
          timestamp: date.getTime(),
          clicks: (existing?.clicks ?? 0) + 1,
        }

        return clicksByDate
      },
      {}
    )
  ).sort((a, b) => a.timestamp - b.timestamp)

  const totalDevices =
    analytics.devices.mobile +
    analytics.devices.tablet +
    analytics.devices.desktop

  if (loading) {
    return (
      <div className="content-wrapper flex min-h-[60vh] items-center justify-center p-6 sm:p-8 lg:p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="content-wrapper space-y-6 p-6 sm:p-8 lg:p-10">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href={`/projects/${projectId}/campaigns/${campaignId}`}>
            <div className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span>Back to Campaign</span>
            </div>
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Link Analytics
            </h1>
            <p className="mt-2 text-muted-foreground">
              Detailed performance metrics for{" "}
              <span className="font-bold">/{slug}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleExport("json")}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download size={16} />
              Export JSON
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Clicks */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tighter">
            Recent Clicks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.recentActivity.map((click, index) => (
                  <TableRow key={index}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(click.clickedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {click.geo?.country || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-normal capitalize"
                      >
                        {click.device?.type || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{click.browser?.name || "Unknown"}</TableCell>
                    <TableCell>{click.os?.name || "Unknown"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tighter">
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.countries.map((country, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {country.country || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {country.count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tighter">
              Device Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Mobile</span>
                <span className="font-semibold text-muted-foreground">
                  {analytics.devices.mobile.toLocaleString()}
                </span>
              </div>
              <Progress
                value={
                  totalDevices > 0
                    ? (analytics.devices.mobile / totalDevices) * 100
                    : 0
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Tablet</span>
                <span className="font-semibold text-muted-foreground">
                  {analytics.devices.tablet.toLocaleString()}
                </span>
              </div>
              <Progress
                value={
                  totalDevices > 0
                    ? (analytics.devices.tablet / totalDevices) * 100
                    : 0
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Desktop</span>
                <span className="font-semibold text-muted-foreground">
                  {analytics.devices.desktop.toLocaleString()}
                </span>
              </div>
              <Progress
                value={
                  totalDevices > 0
                    ? (analytics.devices.desktop / totalDevices) * 100
                    : 0
                }
              />
            </div>
          </CardContent>
        </Card>
        {/* Clicks Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tighter">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clicksOverTime}>
                  <XAxis
                    dataKey="index"
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
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
