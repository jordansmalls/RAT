"use client";
import type { ReactNode } from "react";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import { platformName } from "@/features/dashboard/platforms";
import type { DealValue, DecayCurve, GeoValue, TrafficBucketReason, TrafficQuality } from "../api";
import {
  countryName,
  formatDate,
  formatDays,
  formatMoney,
  formatMultiple,
  formatNumber,
  formatPercent,
  gradeTone,
  tierLabels,
} from "../format";
import { bestSavingChannel } from "../chart-data";
import { DecayChart } from "./sponsor-charts";
import { SponsorDays, SponsorHighlight, SponsorNumber } from "./sponsor-motion";
import styles from "./sponsor.module.css";

export function CardShell({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={dashboard.analyticsCard}>
      <div className={styles.cardHeader}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>
        {value}
        {detail && <small>{detail}</small>}
      </dd>
    </div>
  );
}

export function Grade({ grade }: { grade: string | null }) {
  return (
    <span className={styles.grade} data-tone={gradeTone(grade)} aria-label={grade ? `Grade ${grade}` : "No grade yet"}>
      {grade ? (
        <SponsorHighlight action="circle" color="color-mix(in srgb, currentColor 55%, transparent)" padding={5}>
          {grade}
        </SponsorHighlight>
      ) : (
        "–"
      )}
    </span>
  );
}

const bucketColors: Record<TrafficBucketReason, string> = {
  verified: "var(--good)",
  unidentified: "color-mix(in srgb, var(--good) 50%, var(--surface-3))",
  duplicate: "var(--warn)",
  burst: "color-mix(in srgb, var(--warn) 60%, var(--bad))",
  unclassified: "var(--text-faint)",
  bot: "var(--bad)",
};

export function TrafficQualityCard({ data }: { data: TrafficQuality }) {
  // Verified first, then the other kept bucket, then everything filtered out (API order within each group).
  const rank = (reason: TrafficBucketReason) => (reason === "verified" ? 0 : reason === "unidentified" ? 1 : 2);
  const ordered = [...data.buckets].sort((a, b) => rank(a.reason) - rank(b.reason));
  return (
    <CardShell
      title="Traffic quality certificate"
      description={
        data.period
          ? `${formatDate(data.period.from)} to ${formatDate(data.period.to)}`
          : "Every click is checked once and placed in exactly one bucket."
      }
      aside={<Grade grade={data.grade} />}
    >
      <dl className={styles.statRow}>
        <Stat label="Verified human clicks" value={<SponsorNumber value={data.verifiedHumanClicks} />} />
        <Stat label="Verified share" value={<SponsorNumber value={data.verifiedShare} format={formatPercent} />} />
        <Stat label="Unique verified visitors" value={<SponsorNumber value={data.uniqueVerifiedVisitors} />} />
        <Stat label="Clicks checked" value={<SponsorNumber value={data.totalClicks} />} />
      </dl>
      {data.totalClicks > 0 ? (
        <>
          <div className={styles.stack} role="img" aria-label={`${formatPercent(data.verifiedShare)} verified traffic`}>
            {ordered.map((bucket) =>
              bucket.clicks ? (
                <span
                  key={bucket.reason}
                  title={`${bucket.label}: ${formatNumber(bucket.clicks)}`}
                  style={{
                    width: `${(bucket.clicks / data.totalClicks) * 100}%`,
                    background: bucketColors[bucket.reason],
                  }}
                />
              ) : null,
            )}
          </div>
          <div className={styles.legend}>
            {ordered.map((bucket) => (
              <div className={styles.legendRow} key={bucket.reason}>
                <i style={{ background: bucketColors[bucket.reason] }} />
                <div>
                  {bucket.label} {bucket.filtered && <span className={styles.pill}>Filtered</span>}
                  <p>{bucket.description}</p>
                </div>
                <span>
                  {formatNumber(bucket.clicks)}
                  <small>{formatPercent(bucket.share)}</small>
                </span>
              </div>
            ))}
          </div>
          <details className={styles.details}>
            <summary>How this is calculated</summary>
            <ul>
              {data.methodology.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className={dashboard.helpText}>No clicks yet. The certificate fills in as traffic arrives.</p>
      )}
    </CardShell>
  );
}

const tierColors: Record<string, string> = {
  tier1: "var(--accent)",
  tier2: "color-mix(in srgb, var(--accent) 55%, var(--surface-3))",
  tier3: "color-mix(in srgb, var(--accent) 25%, var(--surface-3))",
  unknown: "var(--surface-3)",
};

export function GeoValueCard({ data, limit = 8 }: { data: GeoValue; limit?: number }) {
  const max = Math.max(1, ...data.countries.map((row) => row.clicks));
  const known = data.tiers.filter((tier) => tier.tier !== "unknown");
  return (
    <CardShell
      title="Geo value"
      description="Human clicks weighted by what advertisers typically pay in each market."
      aside={
        <span className={styles.grade} data-tone={data.score >= 70 ? "good" : data.score >= 40 ? "accent" : "warn"}>
          <SponsorNumber value={data.score} format={(value) => String(Math.round(value ?? 0))} />
        </span>
      }
    >
      <dl className={styles.statRow}>
        <Stat
          label="Geo value score"
          value={
            <>
              <SponsorNumber value={data.score} />
              /100
            </>
          }
        />
        <Stat
          label="Tier-1 audience"
          value={
            <SponsorHighlight>
              <SponsorNumber value={data.tier1Share} format={formatPercent} />
            </SponsorHighlight>
          }
          detail="US, UK, CA, AU, DE and similar"
        />
        <Stat
          label="Human clicks with a country"
          value={<SponsorNumber value={data.humanClicks} />}
          detail={data.unknownClicks ? `${formatNumber(data.unknownClicks)} without a country` : undefined}
        />
      </dl>
      {data.humanClicks > 0 ? (
        <>
          <div className={styles.stack} role="img" aria-label={`${formatPercent(data.tier1Share)} tier-1 audience`}>
            {known.map((tier) => (
              <span
                key={tier.tier}
                title={`${tierLabels[tier.tier] ?? tier.tier}: ${formatPercent(tier.share)}`}
                style={{ width: `${tier.share}%`, background: tierColors[tier.tier] }}
              />
            ))}
          </div>
          <div className={styles.chartKey}>
            {known.map((tier) => (
              <span key={tier.tier}>
                <i data-kind="bar" style={{ background: tierColors[tier.tier], opacity: 1 }} />
                {tierLabels[tier.tier] ?? tier.tier} · {formatPercent(tier.share)} · weight {tier.weight}
              </span>
            ))}
          </div>
          <div className="mt-5">
            {data.countries.slice(0, limit).map((row) => (
              <div className={dashboard.breakdownRow} key={row.country}>
                <div>
                  <span>
                    {countryName(row.country)} <span className={styles.pill}>{tierLabels[row.tier] ?? row.tier}</span>
                  </span>
                  <span>
                    {formatNumber(row.clicks)} <small>{formatPercent(row.share)}</small>
                  </span>
                </div>
                <div className={dashboard.barTrack}>
                  <span style={{ width: `${(row.clicks / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className={dashboard.helpText}>No human clicks with a known country yet.</p>
      )}
    </CardShell>
  );
}

export function DecayLinksTable({ links }: { links: DecayCurve["links"] }) {
  return (
    <div className={`${dashboard.tableScroll} mt-5`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Link</th>
            <th>Published</th>
            <th>Human clicks</th>
            <th>Half-life</th>
            <th>After day 7</th>
          </tr>
        </thead>
        <tbody>
          {links.map((row, i) => (
            <tr key={row.link ?? `${row.title}-${i}`}>
              <td>
                {row.title || "Untitled"}{" "}
                {row.platform && <span className={styles.pill}>{platformName(row.platform)}</span>}
              </td>
              <td>{formatDate(row.publishedAt)}</td>
              <td>{formatNumber(row.humanClicks)}</td>
              <td>{formatDays(row.halfLifeDays)}</td>
              <td>{formatPercent(row.shareAfterDay7)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DecayCurveCard({
  data,
  controls,
  showLinks = true,
}: {
  data: DecayCurve;
  controls?: ReactNode;
  showLinks?: boolean;
}) {
  return (
    <CardShell
      title="Click decay and long tail"
      description="How long a placement keeps earning clicks after it goes live."
      aside={
        <div className="flex items-center gap-2">
          {data.humanClicks > 0 && (
            <span className={styles.pill} data-tone={data.evergreen ? "good" : undefined}>
              {data.evergreen ? <SponsorHighlight action="underline">Evergreen</SponsorHighlight> : "Front-loaded"}
            </span>
          )}
          {controls}
        </div>
      }
    >
      <dl className={styles.statRow}>
        <Stat label="Half-life" value={<SponsorDays value={data.halfLifeDays} />} detail="50% of clicks in by" />
        <Stat label="90% of clicks in by" value={<SponsorDays value={data.p90Days} />} />
        <Stat
          label="Clicks after day 7"
          value={<SponsorNumber value={data.shareAfterDay7} format={formatPercent} />}
          detail={
            <>
              <SponsorNumber value={data.tailClicks} /> long-tail clicks
            </>
          }
        />
        <Stat
          label="Clicks after day 30"
          value={<SponsorNumber value={data.shareAfterDay30} format={formatPercent} />}
        />
      </dl>
      {data.humanClicks > 0 ? (
        <>
          <DecayChart data={data} />
          {showLinks && data.links.length > 0 && <DecayLinksTable links={data.links} />}
          <p className={`${dashboard.helpText} mt-4`}>
            {data.evergreen
              ? "This content keeps working well after launch. That supports a higher flat fee, longer link permanence or usage-rights pricing."
              : "Most clicks arrive soon after launch. Price around the launch window, or add follow-up placements to extend the tail."}
          </p>
        </>
      ) : (
        <p className={dashboard.helpText}>No human clicks yet.</p>
      )}
    </CardShell>
  );
}

export function DealValueCard({ data, actions }: { data: DealValue; actions?: ReactNode }) {
  const currency = data.deal.currency;
  const money = (value: number | null | undefined) => formatMoney(value, currency);
  const saving = bestSavingChannel(data.benchmarks);
  const best = data.benchmarks.find((row) => row.channel === data.bestComparison?.channel);
  return (
    <CardShell
      title="Deal value vs paid ads"
      description={
        <>
          <SponsorNumber value={data.deal.amount} format={money} /> deal compared with typical cost per click on paid
          channels.
        </>
      }
      aside={actions}
    >
      <dl className={styles.statRow}>
        <Stat
          label="Effective cost per human click"
          value={<SponsorNumber value={data.effectiveCpc} format={money} />}
        />
        <Stat
          label="Cost per unique visitor"
          value={<SponsorNumber value={data.costPerUniqueVisitor} format={money} />}
        />
        <Stat
          label={best ? `Cheaper than ${best.label}` : "Best comparison"}
          value={<SponsorNumber value={data.bestComparison?.multiple} format={formatMultiple} />}
          detail={
            best ? (
              <>
                <SponsorNumber value={best.equivalentSpend} format={money} /> to buy the same clicks
              </>
            ) : undefined
          }
        />
        <Stat label="Human clicks" value={<SponsorNumber value={data.humanClicks} />} />
      </dl>
      <div className={dashboard.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Typical CPC</th>
              <th>Cost of the same clicks</th>
              <th>Sponsor saved</th>
              <th>Creator advantage</th>
            </tr>
          </thead>
          <tbody>
            {data.benchmarks.map((row) => (
              <tr key={row.channel}>
                <td>
                  {row.channel === saving?.channel ? (
                    <SponsorHighlight action="underline">{row.label}</SponsorHighlight>
                  ) : (
                    row.label
                  )}
                </td>
                <td>{formatMoney(row.cpc, currency)}</td>
                <td>{formatMoney(row.equivalentSpend, currency)}</td>
                <td>
                  <span className={styles.pill} data-tone={row.savings >= 0 ? "good" : "bad"}>
                    {formatMoney(row.savings, currency)}
                  </span>
                </td>
                <td>
                  <strong>{formatMultiple(row.multiple)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`${dashboard.helpText} mt-4`}>
        {data.benchmarkSource} {currency !== "USD" && data.currencyNote}
      </p>
    </CardShell>
  );
}
