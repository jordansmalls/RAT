"use client";
import { useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import dashboard from "@/features/dashboard/components/dashboard.module.css";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Scope } from "../api";
import { useDecayCurve, useGeoValue, useTrafficQuality } from "../queries";
import { decayDayOptions } from "../schemas";
import { CardShell, DecayCurveCard, DecayLinksTable, GeoValueCard, TrafficQualityCard } from "./sponsor-cards";
import styles from "./sponsor.module.css";

/** Loading and error states shared by every sponsor metric card. */
export function QueryCard<T>({
  title,
  query,
  children,
}: {
  title: string;
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  return (
    <section className={dashboard.analyticsCard} aria-busy={query.isFetching}>
      <h2>{title}</h2>
      {query.isError ? (
        <div role="alert" className={dashboard.errorBanner}>
          Could not load {title.toLowerCase()}.<button onClick={() => void query.refetch()}>Retry</button>
        </div>
      ) : (
        <p role="status" className={dashboard.helpText}>
          Loading…
        </p>
      )}
    </section>
  );
}

/**
 * Sponsor-grade metrics for a project, campaign or link: traffic quality, geo value and decay.
 * These use lifetime clicks, so the period selector above does not apply.
 */
export function SponsorInsights({ projectId, campaignId, linkId }: { projectId: string } & Scope) {
  const scope: Scope = { campaignId: campaignId || undefined, linkId: linkId || undefined };
  const [days, setDays] = useState<number>(90);
  const quality = useTrafficQuality(projectId, scope);
  const geo = useGeoValue(projectId, scope);
  const decay = useDecayCurve(projectId, scope, days);

  return (
    <section className="space-y-4" aria-labelledby="sponsor-insights-heading">
      <div>
        <h2 id="sponsor-insights-heading" className="text-sm font-medium">
          Sponsor insights
        </h2>
        <p className={dashboard.helpText}>
          Lifetime numbers you can quote in a sponsorship negotiation. Bots and suspicious repeats are filtered out.
        </p>
      </div>
      <QueryCard title="Traffic quality certificate" query={quality}>
        {(data) => <TrafficQualityCard data={data} />}
      </QueryCard>
      <div className={styles.grid2}>
        <QueryCard title="Geo value" query={geo}>
          {(data) => <GeoValueCard data={data} />}
        </QueryCard>
        <QueryCard title="Click decay and long tail" query={decay}>
          {(data) => (
            <DecayCurveCard
              data={data}
              showLinks={false}
              controls={
                <NativeSelect
                  size="sm"
                  aria-label="Curve length"
                  value={String(days)}
                  onChange={(event) => setDays(Number(event.target.value))}
                >
                  {decayDayOptions.map((option) => (
                    <NativeSelectOption key={option} value={option}>
                      {option} days
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              }
            />
          )}
        </QueryCard>
      </div>
      {decay.data && decay.data.links.length > 1 && (
        <CardShell title="Long tail by link" description="Which placements keep earning after launch.">
          <DecayLinksTable links={decay.data.links} />
        </CardShell>
      )}
    </section>
  );
}
