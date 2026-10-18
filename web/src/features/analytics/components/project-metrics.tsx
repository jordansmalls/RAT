"use client";
import { useState, type ReactElement, type ReactNode } from "react";
import { Highlighter } from "@/components/ui/highlighter";
import { HeadlineNumber } from "./headline-number";
import { useMetric } from "../queries";
import { downloadClicks, type Metrics, type Network, type Hero } from "../api";
import { metricNames, type MetricName } from "../schemas";
import { saveDownload } from "../download";
import { platformName } from "@/features/dashboard/platforms";
import { errorMessage } from "@/lib/api";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import styles from "@/features/dashboard/components/dashboard.module.css";
const labels: Record<MetricName, string> = {
  "human-confidence": "Human confidence",
  "clicks-per-platform": "Clicks per platform",
  "global-reach": "Global reach",
  efficiency: "Platform efficiency",
  heatmap: "Golden hour heatmap",
  loyalty: "Audience loyalty",
  "device-breakdown": "Device breakdown",
  "recent-activity": "Recent activity",
  "platform-dominance": "Platform dominance",
  "network-effect": "Network effect",
  velocity: "Velocity",
  "hero-campaign": "Hero campaign",
  "monthly-health": "Monthly health",
};
const format = (value: number | undefined) =>
  value === undefined ? "Unavailable" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
function Stats({ items }: { items: [string, string | number | undefined | ReactElement, string?][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {items.map(([name, value, suffix = ""]) => (
        <div key={name}>
          <dt className={styles.metadata}>{name}</dt>
          <dd className="mt-2 text-sm font-semibold tabular-nums">
            {typeof value === "number" ? (
              <HeadlineNumber value={value} format={(latest) => `${format(latest)}${suffix}`} />
            ) : value === undefined ? (
              `${format(value)}${suffix}`
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function Bars({ rows, suffix = "" }: { rows: { name: string; value: number }[]; suffix?: string }) {
  const [descending, setDescending] = useState(true);
  const sorted = [...rows].sort((a, b) => (descending ? b.value - a.value : a.value - b.value));
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <>
      <button className={styles.textButton} onClick={() => setDescending(!descending)}>
        Sort {descending ? "ascending" : "descending"}
      </button>
      {sorted.length ? (
        sorted.map((row) => (
          <div className={styles.breakdownRow} key={row.name}>
            <div>
              <span>{row.name}</span>
              <span>
                {format(row.value)}
                {suffix}
              </span>
            </div>
            <div className={styles.barTrack}>
              <span style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className={styles.helpText}>No activity yet.</p>
      )}
    </>
  );
}
function NetworkStats({ data }: { data: Network }) {
  return (
    <Stats
      items={
        data.audience
          ? [
              ["Total clicks", data.totalClicks],
              ["Identified visitors", data.audience.uniqueVisitors],
              ["Clicks per identified visitor", data.audience.clicksPerVisitor],
              ["Identity coverage", data.audience.identityCoveragePercent, "%"],
            ]
          : [
              ["Total clicks", data.totalClicks],
              ["Distinct IP count (legacy)", data.uniqueVisitors],
              ["Clicks per IP (legacy)", data.ratio],
            ]
      }
    />
  );
}
function HeroStats({ data }: { data: Hero }) {
  return (
    <Stats
      items={[
        [
          "Campaign",
          data.title ? (
            <Highlighter
              action="highlight"
              color="color-mix(in srgb, var(--accent) 25%, transparent)"
              animationDuration={250}
              iterations={1}
              padding={1}
              isView
            >
              {data.title}
            </Highlighter>
          ) : (
            (data.title ?? "No activity yet")
          ),
        ],
        ["Clicks", data.clickCount],
      ]}
    />
  );
}
function Panel<K extends MetricName>({
  projectId,
  name,
  linkId,
  children,
}: {
  projectId: string;
  name: K;
  linkId?: string;
  children: (data: Metrics[K]) => ReactNode;
}) {
  const query = useMetric(projectId, name, linkId);
  return (
    <section className={styles.analyticsCard} aria-busy={query.isFetching}>
      <div className={styles.sectionToolbar}>
        <h2>{labels[name]}</h2>
        <button className={styles.textButton} disabled={query.isFetching} onClick={() => void query.refetch()}>
          Refresh
        </button>
      </div>
      {query.isPending ? (
        <p role="status" className={styles.helpText}>
          Loading metrics…
        </p>
      ) : query.isError ? (
        <div role="alert" className={styles.errorBanner}>
          Could not load metrics.
          <button onClick={() => void query.refetch()}>Retry</button>
        </div>
      ) : (
        children(query.data)
      )}
    </section>
  );
}
function MetricContent({ projectId, metric, linkId }: { projectId: string; metric: MetricName; linkId?: string }) {
  const props = { projectId, linkId };
  switch (metric) {
    case "human-confidence":
      return (
        <Panel {...props} name={metric}>
          {(data) => <Stats items={[["Human confidence", data.confidence, "%"]]} />}
        </Panel>
      );
    case "clicks-per-platform":
      return (
        <Panel {...props} name={metric}>
          {(data) => <Bars rows={data.data.map((row) => ({ name: platformName(row.platform), value: row.count }))} />}
        </Panel>
      );
    case "global-reach":
      return (
        <Panel {...props} name={metric}>
          {(data) => <Bars rows={data.data.map((row) => ({ name: row.country || "Unknown", value: row.count }))} />}
        </Panel>
      );
    case "efficiency":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <>
              <p className={styles.helpText}>
                Legacy intent is distinct IPs divided by clicks. Cookie audience counts are shown when available.
              </p>
              <Bars rows={data.data.map((row) => ({ name: platformName(row.platform), value: row.intent }))} />
              {data.data.map(
                (row) =>
                  row.audience && (
                    <div className="mt-6" key={row.platform}>
                      <p className={`${styles.metadata} mb-3`}>{platformName(row.platform)} audience</p>
                      <Stats
                        items={[
                          ["Identified visitors", row.audience.uniqueVisitors],
                          ["Repeat visitors", row.audience.repeatVisitorPercent, "%"],
                          ["Identity coverage", row.audience.identityCoveragePercent, "%"],
                        ]}
                      />
                    </div>
                  ),
              )}
            </>
          )}
        </Panel>
      );
    case "heatmap":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <caption className={`${styles.metadata} mb-4 text-left`}>Clicks by UTC weekday and hour</caption>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    {Array.from({ length: 24 }, (_, h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, d) => (
                    <tr key={day}>
                      <th scope="row">{day}</th>
                      {Array.from({ length: 24 }, (_, h) => {
                        const clicks = data.heatmap.find((row) => row.day === d && row.hour === h)?.clicks ?? 0;
                        return (
                          <td
                            key={h}
                            title={`${day} ${h}:00 UTC: ${clicks} clicks`}
                            className="min-w-6 p-1 text-center"
                            style={{
                              background: clicks
                                ? `color-mix(in srgb, #606AD6 ${Math.max(12, (clicks / Math.max(1, ...data.heatmap.map((row) => row.clicks))) * 100)}%, transparent)`
                                : undefined,
                            }}
                          >
                            {clicks || "·"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      );
    case "loyalty":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <Stats
              items={[
                ["Total clicks", data.totalClicks],
                ["Identified visitors", data.uniqueVisitors],
                [
                  "Repeat visitor percentage",
                  data.repeatVisitorPercent,
                  data.repeatVisitorPercent === undefined ? "" : "%",
                ],
                ["Clicks per identified visitor", data.clicksPerVisitor],
                ["Unidentified clicks", data.unidentifiedClicks],
              ]}
            />
          )}
        </Panel>
      );
    case "device-breakdown":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <Bars
              rows={["mobile", "tablet", "desktop"].map((key) => ({
                name: key,
                value: data[key as "mobile" | "tablet" | "desktop"],
              }))}
            />
          )}
        </Panel>
      );
    case "recent-activity":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Platform</th>
                    <th>Country</th>
                    <th>Device</th>
                    <th>OS</th>
                    <th>Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row, index) => (
                    <tr key={`${row.clickedAt}:${index}`} className="border-b">
                      <td className="py-3">{new Date(row.clickedAt).toLocaleString()}</td>
                      <td>{row.platform ? platformName(row.platform) : "Unknown"}</td>
                      <td>{row.geo?.country || "Unknown"}</td>
                      <td>{row.device?.type || "Unknown"}</td>
                      <td>{row.os?.name || "Unknown"}</td>
                      <td>{row.browser?.name || "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.data.length && <p className={styles.helpText}>No activity yet.</p>}
            </div>
          )}
        </Panel>
      );
    case "platform-dominance":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <Bars suffix="%" rows={data.data.map((row) => ({ name: platformName(row.platform), value: row.share }))} />
          )}
        </Panel>
      );
    case "network-effect":
      return (
        <Panel {...props} name={metric}>
          {(data) => <NetworkStats data={data} />}
        </Panel>
      );
    case "velocity":
      return (
        <Panel {...props} name={metric}>
          {(data) => <Stats items={[["Click growth vs previous 30 days", data.growth, "%"]]} />}
        </Panel>
      );
    case "hero-campaign":
      return (
        <Panel {...props} name={metric}>
          {(data) => <HeroStats data={data} />}
        </Panel>
      );
    case "monthly-health":
      return (
        <Panel {...props} name={metric}>
          {(data) => (
            <div className="space-y-6">
              <NetworkStats data={data.networkEffect} />
              <Stats items={[["Click growth vs previous 30 days", data.velocity.growth, "%"]]} />
              <HeroStats data={data.heroCampaign} />
              <Bars
                suffix="%"
                rows={data.dominance.map((row) => ({ name: platformName(row.platform), value: row.share }))}
              />
            </div>
          )}
        </Panel>
      );
  }
}
export function ProjectMetrics({ projectId, linkId }: { projectId: string; linkId?: string }) {
  const [metric, setMetric] = useState<MetricName>("human-confidence");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download(format: "csv" | "json") {
    setBusy(true);
    setError("");
    try {
      saveDownload(await downloadClicks(projectId, format, linkId), `clicks-${projectId}.${format}`);
    } catch (error) {
      setError(errorMessage(error, "Could not export clicks."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 space-y-4" aria-labelledby="project-insights-heading">
      <div className={styles.sectionToolbar}>
        <label className="flex items-center gap-3">
          <span id="project-insights-heading" className="text-sm font-medium">
            {linkId ? "Link insights" : "Project insights"}
          </span>
          <NativeSelect
            size="sm"
            aria-label="Insight"
            value={metric}
            onChange={(event) => setMetric(event.target.value as MetricName)}
          >
            {metricNames.map((name) => (
              <NativeSelectOption value={name} key={name}>
                {labels[name]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <div className={styles.inlineActions}>
          {(["csv", "json"] as const).map((format) => (
            <button key={format} className={styles.textButton} disabled={busy} onClick={() => void download(format)}>
              Export clicks {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.helpText}>
        These insights use lifetime clicks, including detected bots. Velocity compares the last 30 days with the
        previous 30 days. The period selector above applies to overview metrics.
      </p>
      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}
      <MetricContent
        key={`${projectId}:${metric}:${linkId ?? ""}`}
        projectId={projectId}
        metric={metric}
        linkId={linkId}
      />
    </section>
  );
}
