export const PERFORMANCE_WINDOWS = { "24h": 24, "7d": 168, "30d": 720 };
export const BUCKET_COUNT = 12;

export function performanceWindow(window, now = new Date()) {
    if (typeof window !== "string" || !Object.hasOwn(PERFORMANCE_WINDOWS, window)) return null;
    const hours = PERFORMANCE_WINDOWS[window];
    if (!hours) return null;
    const duration = hours * 60 * 60 * 1000;
    return {
        window,
        hours,
        start: new Date(now.getTime() - duration),
        end: now,
        previousStart: new Date(now.getTime() - duration * 2),
        bucketMs: duration / BUCKET_COUNT,
    };
}

// Rows are aggregated in MongoDB so no individual visitor records leave the server.
export function summarizeLinkPerformance(links, rows, period) {
    const metrics = new Map(links.map((link) => [String(link._id), {
        clicks: 0,
        previousClicks: 0,
        trend: Array(BUCKET_COUNT).fill(0),
    }]));
    for (const row of rows) {
        const metric = metrics.get(String(row._id.link));
        if (!metric) continue;
        const bucket = row._id.bucket;
        if (bucket >= 0 && bucket < BUCKET_COUNT) {
            metric.clicks += row.count;
            metric.trend[bucket] += row.count;
        } else if (bucket >= -BUCKET_COUNT && bucket < 0) {
            metric.previousClicks += row.count;
        }
    }
    const total = [...metrics.values()].reduce((sum, metric) => sum + metric.clicks, 0);
    const peak = Math.max(0, ...[...metrics.values()].map((metric) => metric.clicks));
    return links.map((link) => {
        const metric = metrics.get(String(link._id));
        return {
            ...link,
            performance: {
                ...metric,
                clicksPerHour: metric.clicks / period.hours,
                changePercent: metric.previousClicks > 0
                    ? (metric.clicks - metric.previousClicks) / metric.previousClicks * 100
                    : null,
                sharePercent: total > 0 ? metric.clicks / total * 100 : 0,
                velocityPercent: peak > 0 ? metric.clicks / peak * 100 : 0,
            },
        };
    });
}
