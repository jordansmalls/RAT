"use client";

import { Highlighter } from "@/components/ui/highlighter";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { ComponentProps } from "react";
import { useReducedMotion } from "motion/react";
import { formatDays, formatNumber } from "../format";
import styles from "./sponsor.module.css";

/** The final text reserves space, supplies the accessible name and prints before scrolling. */
export function SponsorNumber({
  value,
  format = formatNumber,
}: {
  value: number | null | undefined;
  format?: (value: number | null | undefined) => string;
}) {
  const reducedMotion = useReducedMotion();
  // With reduced motion there is nothing to animate, so render plain text.
  if (value == null || reducedMotion) return format(value);
  return (
    <span className={styles.number}>
      <span className="sr-only">{format(value)}</span>
      <span className={styles.numberFinal} aria-hidden="true">
        {format(value)}
      </span>
      <NumberTicker
        value={value}
        format={format}
        aria-hidden="true"
        className={`${styles.numberAnimated} tracking-[inherit] text-inherit dark:text-inherit`}
      />
    </span>
  );
}

export function SponsorDays({ value }: { value: number | null }) {
  if (value == null || value === 0) return formatDays(value);
  return <SponsorNumber value={value} format={(day) => formatDays(day == null ? day : Math.round(day))} />;
}

export function SponsorHighlight({ children, ...props }: ComponentProps<typeof Highlighter>) {
  return (
    // Rough Notation inserts its SVG beside the target. Anchor both to the same local box
    // so annotations follow nested dashboard scrolling and the sponsor-kit sheet.
    <span className={styles.highlight}>
      <Highlighter
        color="color-mix(in srgb, var(--good) 35%, transparent)"
        animationDuration={250}
        iterations={1}
        isView
        {...props}
      >
        {children}
      </Highlighter>
    </span>
  );
}
