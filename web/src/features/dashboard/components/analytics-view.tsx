"use client";

import { useState } from "react";
import { Highlighter } from "@/components/ui/highlighter";
import { HeadlineNumber } from "@/features/analytics/components/headline-number";
import { ClickActivity } from "@/features/analytics/components/click-activity";
import { Download, RefreshCw, ArrowUpRight } from "@/components/icons";
import { useOverview } from "@/features/analytics/queries";
import { ProjectMetrics } from "@/features/analytics/components/project-metrics";
import { SponsorInsights } from "@/features/sponsor/components/sponsor-insights";
import { saveDownload } from "@/features/analytics/download";
import { csvBlob, overviewCsvRows } from "@/features/analytics/csv";
import type { AnalyticsBreakdown, PerformanceWindow } from "@/features/dashboard/types";
import { platformName } from "@/features/dashboard/platforms";
import styles from "./dashboard.module.css";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function Breakdown({ title, rows, total }: { title: string; rows: AnalyticsBreakdown[]; total: number }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className={styles.analyticsCard}>
      <h2>{title}</h2>
      {rows.length ? (
        rows.slice(0, 7).map((row) => (
          <div key={row.name} className={styles.breakdownRow}>
            <div>
              <span title={row.name}>{row.name}</span>
              <span>
                {number.format(row.count)} <small>{total ? Math.round((row.count / total) * 100) : 0}%</small>
              </span>
            </div>
            <div className={styles.barTrack}>
              <span style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className={styles.helpText}>No activity in this period.</p>
      )}
    </section>
  );
}

export function AnalyticsView({
  projectId = "",
  campaignId = "",
  linkId = "",
  onProject,
  onCampaign,
}: {
  projectId?: string;
  campaignId?: string;
  linkId?: string;
  onProject?: (id: string) => void;
  onCampaign?: (id: string) => void;
}) {
  const [range, setRange] = useState<PerformanceWindow>("30d");
  const overview = useOverview({
    window: range,
    projectId: projectId || undefined,
    campaignId: campaignId || undefined,
    linkId: linkId || undefined,
  });
  const loading = overview.isPending;
  const data = overview.data;
  const summary = data?.summary;
  const change =
    summary && summary.previousClicks
      ? ((summary.clicks - summary.previousClicks) / summary.previousClicks) * 100
      : null;
  const exportCsv = () => data && saveDownload(csvBlob(overviewCsvRows(data)), `analytics-${data.window}.csv`);
  const heatPeak = Math.max(1, ...(data?.heatmap.map((row) => row.count) ?? []));
  return (
    <div className={styles.analyticsView} aria-busy={overview.isFetching}>
      <div className={styles.sectionToolbar}>
        <div className={styles.periods} aria-label="Analytics period">
          {(["24h", "7d", "30d"] as const).map((period) => (
            <button key={period} aria-pressed={range === period} onClick={() => setRange(period)}>
              {period === "24h" ? "24 hours" : period === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
        <div className={styles.inlineActions}>
          <button className={styles.textButton} disabled={!data || overview.isPlaceholderData} onClick={exportCsv}>
            <Download />
            Export CSV
          </button>
          <button
            className={styles.textButton}
            disabled={!data || overview.isPlaceholderData}
            onClick={() =>
              data &&
              saveDownload(
                new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
                `analytics-${data.window}.json`,
              )
            }
          >
            Export JSON
          </button>
          <button
            className={styles.iconButton}
            aria-label="Refresh analytics"
            disabled={loading}
            onClick={() => void overview.refetch()}
          >
            <RefreshCw />
          </button>
        </div>
      </div>
      {loading ? (
        <p role="status" className={styles.emptyState}>
          Loading analytics…
        </p>
      ) : !data ? (
        <div role="alert" className={styles.errorBanner}>
          Could not load analytics. Try again.
          <button onClick={() => void overview.refetch()}>Retry</button>
        </div>
      ) : (
        <>
          <div className={styles.metricGrid}>
            {[
              {
                name: "Human clicks",
                value: data.summary.clicks,
                detail:
                  change === null
                    ? `${number.format(data.summary.previousClicks)} in previous period`
                    : `${change >= 0 ? "+" : ""}${number.format(change)}% vs previous period`,
              },
              {
                name: "Identified visitors",
                value: data.summary.visitors,
                detail: `${number.format(data.summary.returningVisitors)} returned in this period`,
              },
              {
                name: "Active links",
                value: data.summary.activeLinks,
                detail: `${data.summary.links} tracking links in scope`,
              },
              {
                name: "Campaigns",
                value: data.summary.campaigns,
                detail: `${data.summary.projects} projects in scope`,
              },
            ].map((stat) => (
              <section className={styles.metricTile} key={stat.name}>
                <h2>{stat.name}</h2>
                <p>
                  <HeadlineNumber value={stat.value} format={number.format} />
                </p>
                <span
                  className={
                    stat.name === "Human clicks" && change !== null && change < 0 ? styles.negativeGrowth : undefined
                  }
                >
                  {stat.name === "Human clicks" && change !== null && change > 0 ? (
                    <Highlighter
                      action="underline"
                      color="color-mix(in srgb, var(--good) 70%, transparent)"
                      strokeWidth={1}
                      iterations={1}
                      animationDuration={250}
                      padding={2}
                    >
                      {stat.detail}
                    </Highlighter>
                  ) : (
                    stat.detail
                  )}
                </span>
              </section>
            ))}
          </div>
          <ClickActivity data={data} />
          <div className={styles.analyticsGrid}>
            <Breakdown
              title="Platforms"
              rows={data.platforms.map((row) => ({
                ...row,
                name: platformName(row.name),
              }))}
              total={data.summary.clicks}
            />
            <Breakdown title="Countries" rows={data.countries} total={data.summary.clicks} />
            <Breakdown
              title="Devices"
              rows={data.devices.map((row) => ({
                ...row,
                name: row.name.charAt(0).toUpperCase() + row.name.slice(1),
              }))}
              total={data.summary.clicks}
            />
            <Breakdown title="Browsers" rows={data.browsers} total={data.summary.clicks} />
            <Breakdown title="Traffic sources" rows={data.sources} total={data.summary.clicks} />
            <section className={styles.analyticsCard}>
              <h2>Audience coverage</h2>
              <div className={styles.coverageValue}>
                <HeadlineNumber
                  value={data.summary.clicks ? (data.summary.identifiedClicks / data.summary.clicks) * 100 : 0}
                  format={(value) => `${number.format(value)}%`}
                />
              </div>
              <p className={styles.helpText}>
                Of human clicks have a visitor identity. Visitors are counted within each project, so the same person in
                two projects counts twice.
              </p>
              <p className={styles.helpText}>
                {number.format(data.summary.clicks - data.summary.identifiedClicks)} clicks have no visitor identity.
              </p>
            </section>
          </div>
          {!linkId && !campaignId && (
            <div className={styles.analyticsGrid}>
              {(["projects", "campaigns"] as const).map((group) => (
                <section className={styles.analyticsCard} key={group}>
                  <h2>{group === "projects" ? "Projects" : "Campaigns"}</h2>
                  {data[group].length ? (
                    data[group].map((row) => (
                      <button
                        key={row.id}
                        className={styles.rankRow}
                        onClick={() => (group === "projects" ? onProject?.(row.id) : onCampaign?.(row.id))}
                        disabled={group === "projects" ? !onProject : !onCampaign}
                      >
                        <span>{row.name}</span>
                        <span>
                          {number.format(row.count)} clicks
                          <ArrowUpRight size={13} />
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className={styles.helpText}>No {group} yet.</p>
                  )}
                </section>
              ))}
            </div>
          )}
          <section className={styles.analyticsCard}>
            <div className={styles.sectionToolbar}>
              <h2>Activity by hour</h2>
              <span className={styles.metadata}>UTC · darker to brighter = more clicks</span>
            </div>
            <div className={styles.heatmap}>
              {days.map((day, d) => (
                <div key={day}>
                  <span>{day}</span>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const count = data.heatmap.find((row) => row.day === d && row.hour === hour)?.count ?? 0;
                    return (
                      <span
                        key={hour}
                        className={styles.heatCell}
                        style={{
                          background: `color-mix(in srgb, var(--accent) ${count ? 15 + (count / heatPeak) * 85 : 0}%, var(--surface-3))`,
                        }}
                        title={`${day}, ${hour}:00 UTC: ${count} clicks`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.heatAxis}>
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </section>
          <section className={styles.analyticsCard}>
            <h2>Recent activity</h2>
            <div className={styles.tableScroll}>
              <table className={styles.analyticsTable}>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Country</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row._id}>
                      <td>{row.campaignTitle}</td>
                      <td>{row.country || "Unknown"}</td>
                      <td>{row.device || "Unknown"}</td>
                      <td>{row.browser || "Unknown"}</td>
                      <td>{new Date(row.clickedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.recent.length && <p className={styles.helpText}>No clicks in this period.</p>}
            <p className={styles.helpText}>Latest 20 human clicks in the selected period.</p>
          </section>
        </>
      )}
      {projectId && (!campaignId || linkId) && (
        <SponsorInsights projectId={projectId} campaignId={campaignId} linkId={linkId} />
      )}
      {projectId && !campaignId && <ProjectMetrics projectId={projectId} />}
    </div>
  );
}
