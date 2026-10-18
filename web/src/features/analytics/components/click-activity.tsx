"use client";

import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AnalyticsOverview } from "@/features/dashboard/types";
import { trendDateLabel, trendTotals } from "../trend";
import styles from "@/features/dashboard/components/dashboard.module.css";

const chartConfig = {
  count: { label: "Human clicks", color: "var(--accent)" },
  botCount: { label: "Bots filtered", color: "var(--warn)" },
} satisfies ChartConfig;
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function ClickActivity({ data }: { data: AnalyticsOverview }) {
  const [series, setSeries] = useState<keyof typeof chartConfig>("count");
  const chartId = useId();
  const totals = trendTotals(data.trend);
  const empty = totals[series] === 0;

  return (
    <section className={`${styles.analyticsCard} ${styles.activityCard}`} aria-labelledby={`${chartId}-title`}>
      <div className={styles.activityHeader}>
        <div className={styles.activityHeading}>
          <h2 id={`${chartId}-title`}>Click activity</h2>
          <p className={styles.metadata}>
            {trendDateLabel(data.start, data.window, true)} to {trendDateLabel(data.end, data.window, true)} UTC
          </p>
        </div>
        <div className={styles.activityToggles} role="group" aria-label="Click activity series">
          {(["count", "botCount"] as const).map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={series === key}
              aria-controls={chartId}
              onClick={() => setSeries(key)}
              style={{ "--series-color": chartConfig[key].color } as React.CSSProperties}
            >
              <span>{chartConfig[key].label}</span>
              <strong>{number.format(totals[key])}</strong>
            </button>
          ))}
        </div>
      </div>
      <div id={chartId} className={styles.activityBody}>
        <ChartContainer
          id={chartId}
          config={chartConfig}
          className={`aspect-auto h-[220px] w-full ${styles.activityChart}`}
          aria-label={`${number.format(totals[series])} ${chartConfig[series].label.toLowerCase()} in 12 equal time intervals, UTC`}
        >
          <BarChart accessibilityLayer data={data.trend} margin={{ left: 8, right: 8, top: 12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={32}
              tickFormatter={(date: string) => trendDateLabel(date, data.window)}
            />
            <ChartTooltip
              cursor={{ fill: "var(--surface-3)" }}
              content={
                <ChartTooltipContent
                  className={styles.activityTooltip}
                  labelFormatter={(_, payload) => `${trendDateLabel(payload[0].payload.date, data.window, true)} UTC`}
                />
              }
            />
            <Bar dataKey={series} fill={`var(--color-${series})`} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <p className={styles.helpText} aria-live="polite">
          {empty
            ? series === "count"
              ? "No human clicks in this period."
              : "No bots filtered in this period."
            : "Detected bots are excluded from human clicks."}
        </p>
      </div>
    </section>
  );
}
