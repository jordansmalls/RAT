"use client";

import { NumberTicker } from "@/components/ui/number-ticker";
import { useReducedMotion } from "motion/react";

/** Reserve the final text's width and expose a stable value to screen readers. */
export function HeadlineNumber({ value, format }: { value: number; format: (value: number) => string }) {
  const reduceMotion = useReducedMotion();
  return (
    <span className="inline-grid tabular-nums">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {format(value)}
      </span>
      {reduceMotion ? (
        <span aria-hidden="true" className="col-start-1 row-start-1 whitespace-nowrap">
          {format(value)}
        </span>
      ) : (
        <NumberTicker
          value={value}
          format={format}
          aria-hidden="true"
          className="col-start-1 row-start-1 tracking-normal whitespace-nowrap text-inherit dark:text-inherit"
        />
      )}
    </span>
  );
}
