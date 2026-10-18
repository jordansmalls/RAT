"use client";

import { useState } from "react";
import {
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
} from "@/components/icons";
import { AnalyticsView } from "@/features/dashboard/components/analytics-view";
import styles from "@/features/dashboard/components/dashboard.module.css";
import LinkRow from "@/features/dashboard/components/LinkRow";
import { useCampaign, usePerformance } from "@/features/dashboard/queries";
import type { PerformanceWindow } from "@/features/dashboard/types";
import { CampaignLinkForm } from "@/features/dashboard/components/campaign-link-form";
import { SponsorKit } from "@/features/sponsor/components/sponsor-kit";
import { platformName } from "@/features/dashboard/platforms";
import { saveDownload } from "@/features/analytics/download";
import { csvBlob, linkCsvRows } from "@/features/analytics/csv";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const periods: PerformanceWindow[] = ["24h", "7d", "30d"];
const hours = { "24h": 24, "7d": 168, "30d": 720 };
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function CampaignOverview({
  projectId,
  campaignId,
  initialAnalytics = false,
  onManage,
  initialAddLink = false,
}: {
  projectId: string;
  campaignId: string;
  initialAnalytics?: boolean;
  onManage?: () => void;
  initialAddLink?: boolean;
}) {
  const [range, setRange] = useState<PerformanceWindow>("24h");
  const details = useCampaign(campaignId);
  const performance = usePerformance(campaignId, range);
  const campaign = details.data;
  const data = performance.data;
  const loading = performance.isFetching || details.isFetching;
  const error = performance.isError || details.isError ? "Could not load campaign analytics. Please try again." : null;
  const refresh = () => {
    void details.refetch();
    void performance.refetch();
  };
  const [addingLink, setAddingLink] = useState(initialAddLink);
  const [view, setView] = useState<"links" | "analytics" | "sponsor">(initialAnalytics ? "analytics" : "links");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("clicks");

  const links = data?.links ?? [];
  const total = links.reduce((sum, link) => sum + link.performance.clicks, 0);
  const previous = links.reduce((sum, link) => sum + link.performance.previousClicks, 0);
  const leader = [...links].sort((a, b) => b.performance.clicks - a.performance.clicks)[0];
  const query = search.trim().toLowerCase();
  const visible = links
    .filter((link) => {
      return (
        `${platformName(link.platform)} ${link.title} ${link.customUrl}`.toLowerCase().includes(query) &&
        (status === "all" || link.isActive === (status === "active"))
      );
    })
    .sort((a, b) =>
      sort === "platform"
        ? platformName(a.platform).localeCompare(platformName(b.platform))
        : sort === "growth"
          ? b.performance.clicks - b.performance.previousClicks - (a.performance.clicks - a.performance.previousClicks)
          : b.performance.clicks - a.performance.clicks ||
            platformName(a.platform).localeCompare(platformName(b.platform)),
    );

  const exportCsv = () =>
    data && saveDownload(csvBlob(linkCsvRows(visible, range, data)), `campaign-${campaignId}-${range}.csv`);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="type-page-title">{campaign?._id === campaignId ? campaign.title : "Campaign"}</h1>
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setView(view === "analytics" ? "links" : "analytics")}>
              {view === "analytics" ? "Tracking links" : "Analytics"}
            </Button>
            <Button variant="outline" onClick={() => setView(view === "sponsor" ? "links" : "sponsor")}>
              {view === "sponsor" ? "Tracking links" : "Sponsor kit"}
            </Button>
            {onManage && (
              <Button variant="outline" onClick={onManage}>
                Edit campaign
              </Button>
            )}
            <Button onClick={() => setAddingLink(true)} className="gap-2">
              <Plus className="size-4" /> Add tracking link
            </Button>
          </div>
        </div>
      </div>

      {addingLink && (
        <CampaignLinkForm
          projectId={projectId}
          campaignId={campaignId}
          onCancel={() => setAddingLink(false)}
          onSuccess={() => {
            setAddingLink(false);
            refresh();
          }}
        />
      )}
      {view === "analytics" ? (
        <AnalyticsView projectId={projectId} campaignId={campaignId} />
      ) : view === "sponsor" ? (
        <SponsorKit projectId={projectId} campaign={campaign?._id === campaignId ? campaign : undefined} />
      ) : (
        <Tabs value={range} onValueChange={(value) => setRange(value as PerformanceWindow)} className="gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList aria-label="Analytics period" className="period-tabs">
              {periods.map((period) => (
                <TabsTrigger key={period} value={period}>
                  {period === "24h" ? "Last 24 hours" : period === "7d" ? "7 days" : "30 days"}
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
                onClick={() => refresh()}
              >
                <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
              </Button>
            </div>
          </div>
          <TabsContent value={range} className="space-y-6" aria-busy={loading}>
            {error && (
              <div
                role="alert"
                className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {error}
                <Button variant="outline" onClick={() => refresh()}>
                  Retry
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: "Human clicks",
                  value: data ? total.toLocaleString() : "—",
                  detail: data ? `${previous.toLocaleString()} in the previous period` : "Waiting for analytics",
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
                  value: data ? `${links.filter((link) => link.isActive).length}` : "—",
                  detail: data ? `${links.length} tracking links in this campaign` : "Waiting for links",
                  icon: Link2,
                },
              ].map((stat) => (
                <div key={stat.label} className={styles.analyticsCard}>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    {stat.label}
                    <stat.icon className="size-3.5 shrink-0" />
                  </div>
                  <div key={`${range}-${stat.value}`} className="t-digit-group type-section-title mt-3 tabular-nums">
                    <span className="t-digit">{stat.value}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{stat.detail}</p>
                </div>
              ))}
            </div>

            <section className={styles.linkTable} aria-labelledby="tracking-title">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <h2 id="tracking-title" className="type-card-title">
                    Tracking links{" "}
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">{links.length}</span>
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    See which channels turn your content into clicks.
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={!visible.length || loading} onClick={exportCsv}>
                  <Download className="size-3.5" /> Export CSV
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
                <InputGroup className="min-w-44 flex-1 sm:max-w-64">
                  <InputGroupInput
                    aria-label="Search tracking links"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search platforms or links…"
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                </InputGroup>
                <NativeSelect
                  aria-label="Filter link status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <NativeSelectOption value="all">All links</NativeSelectOption>
                  <NativeSelectOption value="active">Active</NativeSelectOption>
                  <NativeSelectOption value="paused">Paused</NativeSelectOption>
                </NativeSelect>
                <NativeSelect
                  aria-label="Sort tracking links"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <NativeSelectOption value="clicks">Most clicks</NativeSelectOption>
                  <NativeSelectOption value="growth">Biggest click increase</NativeSelectOption>
                  <NativeSelectOption value="platform">Platform A–Z</NativeSelectOption>
                </NativeSelect>
              </div>
              <Table className="tracking-table bordered-list">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Platform</TableHead>
                    <TableHead>Tracking link</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right" title="Share of all campaign clicks in the selected period">
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
                        <span className="mt-3 block text-sm text-muted-foreground">Loading tracking links…</span>
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
              <div className="flex flex-wrap justify-between gap-2 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                <span>
                  {visible.length} of {links.length} links · {total.toLocaleString()} campaign clicks
                </span>
                <span>Detected bots excluded · Compared with previous {range}</span>
              </div>
            </section>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Velocity is the average clicks per hour over this period. A full meter marks the fastest link in this
              campaign. Activity shows 12 equal time intervals, scaled per link. Share and velocity always compare all
              campaign links, even when filtered.
            </p>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
