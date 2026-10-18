"use client"

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  /** Formats each frame, e.g. currency or percent. Defaults to en-US with `decimalPlaces`. */
  format?: (value: number) => string
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  format,
  ...props
}: NumberTickerProps) {
  const reduceMotion = useReducedMotion()
  // Whole-number targets (click counts, whole currency amounts) never show fractional frames.
  const render = (frame: number) => {
    const latest = Number.isInteger(value) ? Math.round(frame) : frame
    return format
      ? format(latest)
      : Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))
  }
  const renderRef = useRef(render)
  useEffect(() => {
    renderRef.current = render
  })
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  // Slightly over critical damping: settles in about a second without overshooting the final value.
  const springValue = useSpring(motionValue, {
    damping: 26,
    stiffness: 140,
    restDelta: 0.001,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  // Subscribe before the effect below moves the value, so a reduced-motion jump on mount is rendered.
  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = renderRef.current(latest)
        }
      }),
    [springValue]
  )

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const target = direction === "down" ? startValue : value
    if (reduceMotion) {
      motionValue.jump(target)
      springValue.jump(target)
      if (ref.current) {
        ref.current.textContent = renderRef.current(target)
      }
    } else if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(target)
      }, delay * 1000)
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
    }
  }, [motionValue, springValue, reduceMotion, isInView, delay, value, direction, startValue])

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tracking-wider text-black tabular-nums dark:text-white",
        className
      )}
      {...props}
    >
      {render(direction === "down" ? value : startValue)}
    </span>
  )
}
