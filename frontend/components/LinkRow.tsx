"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight, Copy, Check, Link2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { Link as LinkType, LinkPerformance } from "@/lib/types"
import { platformName, PLATFORM_LABELS } from "@/lib/platforms"
import { TableRow, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface LinkRowProps {
  link: LinkType & { performance: LinkPerformance }
  projectId: string
  campaignId: string
  start: string
  bucketMs: number
}

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

export default function LinkRow({
  link,
  projectId,
  campaignId,
  start,
  bucketMs,
}: LinkRowProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.customUrl)
      if (timer.current) clearTimeout(timer.current)
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy the link. Please try again.")
    }
  }
  const platform = link.platform?.trim().toLowerCase()
  const name = platformName(platform)
  const metric = link.performance
  const hasLogo =
    platform !== "other" && Object.hasOwn(PLATFORM_LABELS, platform)
  const peak = Math.max(1, ...metric.trend)
  const rate =
    metric.clicksPerHour > 0 && metric.clicksPerHour < 0.1
      ? "<0.1"
      : number.format(metric.clicksPerHour)
  const change =
    metric.changePercent === null
      ? metric.clicks > 0
        ? "New activity"
        : "No activity"
      : `${metric.changePercent > 0 ? "+" : ""}${number.format(metric.changePercent)}%`

  return (
    <TableRow className="tracking-row">
      <TableCell className="pl-5">
        <div className="flex w-fit items-center gap-2.5">
          <span className="font-medium">{name}</span>
          {hasLogo ? (
            <Image
              src={`/icons/platforms/${platform}.png`}
              alt=""
              width={28}
              height={28}
              unoptimized
              className={cn(
                "size-7 object-contain",
                platform === "threads" && "rounded-full bg-black"
              )}
            />
          ) : (
            <Link2 className="size-4 text-muted-foreground" />
          )}
        </div>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              link.isActive ? "bg-emerald-500" : "bg-muted-foreground"
            )}
          />
          {link.isActive ? "Active" : "Paused"}
          {platform === "other" && (
            <span className="max-w-32 truncate" title={link.title}>
              · {link.title}
            </span>
          )}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <a
            href={link.customUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={link.customUrl}
            className="max-w-48 truncate font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {link.customUrl.replace(/^https?:\/\//, "")}
          </a>
          <Button
            onClick={handleCopy}
            variant="ghost"
            size="icon-sm"
            aria-label={copied ? `Copied ${name} link` : `Copy ${name} link`}
            title={copied ? "Copied!" : "Copy link"}
            className="copy-button"
          >
            <Copy className="copy-original size-3.5" data-hidden={copied} />
            <span
              className="t-success-check"
              data-state={copied ? "in" : "out"}
              aria-hidden="true"
            >
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </Button>
          <span className="sr-only" role="status">
            {copied ? `${name} link copied` : ""}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <span className="font-semibold">{metric.clicks.toLocaleString()}</span>
        <span
          className={cn(
            "mt-1 block text-[11px]",
            metric.clicks > metric.previousClicks
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-muted-foreground"
          )}
          title={`${metric.previousClicks.toLocaleString()} clicks in the previous equal period`}
        >
          {change}
        </span>
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {number.format(metric.sharePercent)}%
      </TableCell>
      <TableCell>
        <div
          className="flex items-center gap-3"
          title={`${rate} clicks per hour. ${Math.round(metric.velocityPercent)}% of the fastest link in this campaign.`}
        >
          <div
            className="velocity-meter"
            role="img"
            aria-label={`${Math.round(metric.velocityPercent)}% of the fastest link's click rate`}
          >
            {Array.from({ length: 20 }, (_, index) => (
              <span
                key={index}
                className={
                  index < Math.ceil(metric.velocityPercent / 5)
                    ? `lit meter-${Math.floor(index / 5)}`
                    : ""
                }
              />
            ))}
          </div>
          <span className="min-w-12 text-xs tabular-nums">
            {rate}
            <span className="text-muted-foreground">/hr</span>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div
          className="activity-bars"
          role="img"
          aria-label={`${metric.clicks} clicks across 12 intervals, oldest to newest`}
        >
          {metric.trend.map((count, index) => {
            const from = new Date(new Date(start).getTime() + index * bucketMs)
            const to = new Date(from.getTime() + bucketMs)
            return (
              <span
                key={index}
                style={{ height: `${Math.max(5, (count / peak) * 100)}%` }}
                data-empty={count === 0}
                title={`${from.toLocaleString()} to ${to.toLocaleString()}: ${count} clicks`}
              />
            )
          })}
        </div>
      </TableCell>
      <TableCell className="pr-4 text-right">
        <Button
          render={
            <Link
              href={`/projects/${projectId}/campaigns/${campaignId}/links/${link.slug}`}
            />
          }
          nativeButton={false}
          variant="ghost"
          size="icon-sm"
          aria-label={`View ${name} link analytics`}
          title="View link analytics"
        >
          <ArrowUpRight className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
