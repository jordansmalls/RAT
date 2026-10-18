"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { DecayCurve, PublicReport } from "../api";
import { decayTicks } from "../chart-data";
import { formatDate, formatDays, formatNumber, formatPercent } from "../format";
import styles from "./sponsor.module.css";

const decayConfig = {
  clicks: { label: "Human clicks", color: "var(--accent)" },
  cumulativeShare: { label: "Cumulative share", color: "var(--good)" },
} satisfies ChartConfig;
const audienceConfig = {
  clicks: { label: "Human clicks", color: "var(--accent)" },
} satisfies ChartConfig;

export function DecayChart({ data }: { data: DecayCurve }) {
  const days = data.curve.map((point) => point.day);
  return (
    <>
      <ChartContainer
        config={decayConfig}
        className={styles.chart}
        aria-label={`Daily human clicks and cumulative share. Half arrived by ${formatDays(data.halfLifeDays)}; ${formatPercent(data.shareAfterDay7)} came after day 7.`}
      >
        <ComposedChart accessibilityLayer data={data.curve} margin={{ top: 10, right: 2, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--surface-3)" />
          <XAxis
            dataKey="day"
            ticks={decayTicks(days)}
            tickFormatter={(day: number) => `Day ${day}`}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={20}
          />
          <YAxis
            yAxisId="clicks"
            allowDecimals={false}
            tickFormatter={formatNumber}
            width={36}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="share"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(value: number) => `${value}%`}
            width={36}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            isAnimationActive={false}
            content={
              <ChartTooltipContent
                className={styles.chartTooltip}
                labelFormatter={(_, payload) => `Day ${payload[0]?.payload.day}`}
                formatter={(value, name) => (
                  <div className={styles.tooltipRow}>
                    <span>{name === "cumulativeShare" ? "Cumulative share" : "Human clicks"}</span>
                    <strong>
                      {name === "cumulativeShare" ? formatPercent(Number(value)) : formatNumber(Number(value))}
                    </strong>
                  </div>
                )}
              />
            }
          />
          {[7, 30]
            .filter((day) => days.includes(day))
            .map((day) => (
              <ReferenceLine key={day} yAxisId="clicks" x={day} stroke="var(--text-dim)" strokeDasharray="3 3" />
            ))}
          <Bar
            yAxisId="clicks"
            dataKey="clicks"
            fill="var(--color-clicks)"
            fillOpacity={0.35}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="share"
            dataKey="cumulativeShare"
            type="monotone"
            stroke="var(--color-cumulativeShare)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
      <div className={styles.chartKey}>
        <span>
          <i data-kind="bar" /> Clicks per day since publishing
        </span>
        <span>
          <i style={{ background: "var(--good)" }} /> Cumulative share of clicks
        </span>
        <span>
          <i data-kind="marker" /> Day 7 and day 30
        </span>
      </div>
    </>
  );
}

export function AudienceChart({ data }: { data: NonNullable<PublicReport["audience"]> }) {
  if (!data.clicksByDay.length) return <p className={styles.chartEmpty}>No daily human clicks yet.</p>;
  return (
    <ChartContainer
      config={audienceConfig}
      className={styles.chart}
      aria-label={`Human clicks per day over the last ${data.days} days`}
    >
      <BarChart accessibilityLayer data={data.clicksByDay} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--surface-3)" />
        <XAxis
          dataKey="date"
          tickFormatter={(date: string) =>
            new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          }
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
        />
        <YAxis allowDecimals={false} tickFormatter={formatNumber} width={36} tickLine={false} axisLine={false} />
        <ChartTooltip
          isAnimationActive={false}
          content={
            <ChartTooltipContent
              className={styles.chartTooltip}
              labelFormatter={(_, payload) => formatDate(payload[0]?.payload.date)}
            />
          }
        />
        <Bar
          dataKey="clicks"
          fill="var(--color-clicks)"
          radius={[2, 2, 0, 0]}
          maxBarSize={36}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
