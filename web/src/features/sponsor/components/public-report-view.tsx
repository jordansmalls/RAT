"use client";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import { platformName } from "@/features/dashboard/platforms";
import type { PublicReport } from "../api";
import { countryName, formatCompact, formatDate, formatMultiple, formatNumber, formatPercent } from "../format";
import { reportSectionLabels, type ReportSectionKey } from "../schemas";
import { CardShell, DealValueCard, DecayCurveCard, GeoValueCard, TrafficQualityCard } from "./sponsor-cards";
import { summaryHighlight } from "../chart-data";
import { AudienceChart } from "./sponsor-charts";
import { SponsorHighlight, SponsorNumber } from "./sponsor-motion";
import styles from "./sponsor.module.css";

function Breakdown({ rows }: { rows: { name: string; clicks: number; share: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.clicks));
  if (!rows.length) return <p className={dashboard.helpText}>No human clicks yet.</p>;
  return rows.map((row) => (
    <div className={dashboard.breakdownRow} key={row.name}>
      <div>
        <span>{row.name}</span>
        <span>
          {formatNumber(row.clicks)} <small>{formatPercent(row.share)}</small>
        </span>
      </div>
      <div className={dashboard.barTrack}>
        <span style={{ width: `${(row.clicks / max) * 100}%` }} />
      </div>
    </div>
  ));
}

function Audience({ data }: { data: NonNullable<PublicReport["audience"]> }) {
  return (
    <CardShell title="Audience" description={`${formatNumber(data.humanClicks)} human clicks across the campaign.`}>
      <div className={styles.grid2}>
        <div>
          <p className={`${dashboard.metadata} mb-3`}>Top countries</p>
          <Breakdown
            rows={data.topCountries.map((row) => ({
              name: countryName(row.country),
              clicks: row.clicks,
              share: row.share,
            }))}
          />
        </div>
        <div>
          <p className={`${dashboard.metadata} mb-3`}>Devices</p>
          <Breakdown
            rows={data.devices.map((row) => ({
              name: row.type === "unknown" ? "Unknown" : row.type.charAt(0).toUpperCase() + row.type.slice(1),
              clicks: row.clicks,
              share: row.share,
            }))}
          />
        </div>
      </div>
      <p className={`${dashboard.metadata} mt-6`}>Human clicks per day, last {data.days} days</p>
      <AudienceChart data={data} />
    </CardShell>
  );
}

function Links({ links }: { links: NonNullable<PublicReport["links"]> }) {
  return (
    <CardShell title="Placements" description="Every tracked placement in this campaign, ranked by human clicks.">
      {links.length ? (
        <div className={dashboard.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Placement</th>
                <th>Published</th>
                <th>Human clicks</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link, i) => (
                <tr key={`${link.url ?? link.title}-${i}`}>
                  <td>
                    {link.title || "Untitled"} <span className={styles.pill}>{platformName(link.platform)}</span>
                  </td>
                  <td>{formatDate(link.publishedAt)}</td>
                  <td>{formatNumber(link.humanClicks)}</td>
                  <td>{formatPercent(link.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={dashboard.helpText}>No placements have human clicks yet.</p>
      )}
    </CardShell>
  );
}

/** The sponsor-facing report. Sections render in the order the API lists them. */
export function PublicReportView({ data }: { data: PublicReport }) {
  const { report, creator, campaign, headline } = data;
  const summary = summaryHighlight(headline?.summary ?? "");
  const socials = creator.socials.filter((social) => social.followers != null);
  return (
    <div className="grid gap-4">
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Sponsorship performance report</p>
          <h1>{report.title}</h1>
          {headline && (
            <p className={`${styles.summary} mt-2`}>
              {summary.before}
              {summary.phrase && <SponsorHighlight>{summary.phrase}</SponsorHighlight>}
              {summary.after}
            </p>
          )}
        </div>
        <div className={styles.creator}>
          {creator.displayName && <strong>{creator.displayName}</strong>}
          {creator.handle && <span className={styles.pill}>@{creator.handle}</span>}
          {creator.totalFollowers > 0 && (
            <span className={styles.pill}>{formatCompact(creator.totalFollowers)} total followers</span>
          )}
          {socials.map((social) => (
            <span key={social.platform} className={styles.pill} title={social.displayName}>
              {platformName(social.platform)} {social.approximate ? "~" : ""}
              {formatCompact(social.followers)}
            </span>
          ))}
        </div>
        <p className={dashboard.helpText}>
          Campaign <strong>{campaign.title}</strong>
          {report.period && (
            <>
              {" "}
              · {formatDate(report.period.from)} to {formatDate(report.period.to)}
            </>
          )}
        </p>
        {headline && headline.stats.length > 0 && (
          <div className={styles.headlineGrid}>
            {headline.stats.map((stat) => (
              <div className={styles.headlineStat} key={stat.key}>
                <p>{stat.label}</p>
                <strong>
                  <SponsorNumber
                    value={stat.value}
                    format={
                      stat.unit === "percent" ? formatPercent : stat.unit === "multiple" ? formatMultiple : formatNumber
                    }
                  />
                </strong>
                {stat.detail && <p>{stat.detail}</p>}
              </div>
            ))}
          </div>
        )}
      </header>

      {report.sections.map((section) => {
        switch (section) {
          case "trafficQuality":
            return data.trafficQuality && <TrafficQualityCard key={section} data={data.trafficQuality} />;
          case "geo":
            return data.geo && <GeoValueCard key={section} data={data.geo} limit={10} />;
          case "decay":
            return data.decay && <DecayCurveCard key={section} data={data.decay} />;
          case "dealValue":
            return data.dealValue && <DealValueCard key={section} data={data.dealValue} />;
          case "links":
            return data.links && <Links key={section} links={data.links} />;
          case "audience":
            return data.audience && <Audience key={section} data={data.audience} />;
          default:
            return null;
        }
      })}

      {report.unavailableSections.length > 0 && (
        <p className={dashboard.helpText}>
          Temporarily unavailable:{" "}
          {report.unavailableSections
            .map((section) => reportSectionLabels[section as ReportSectionKey] ?? section)
            .join(", ")}
          .
        </p>
      )}
      <p className={styles.footer}>
        Generated {new Date(report.generatedAt).toLocaleString()}. Bots, unclassified traffic and rapid or excess repeat
        clicks are excluded from human counts. Benchmarks are typical industry figures, not quotes.
        {report.expiresAt && ` This link expires ${formatDate(report.expiresAt)}.`}
      </p>
    </div>
  );
}
