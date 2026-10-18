<?php

namespace App\Services\Analytics;

/**
 * Port of `performanceWindow()` from the old `utils/link-performance.js`.
 *
 * A rolling window ending now (24h, 7d or 30d), the same-length window before it, and the
 * width of each of the 12 trend buckets. Times are Unix milliseconds, as in JavaScript.
 */
final readonly class PerformanceWindow
{
    public const WINDOWS = ['24h' => 24, '7d' => 168, '30d' => 720];

    public const BUCKET_COUNT = 12;

    public function __construct(
        public string $window,
        public int $hours,
        public int $start,
        public int $end,
        public int $previousStart,
        public int $bucketMs,
    ) {}

    /**
     * Build a window, or null when the name is not 24h, 7d or 30d.
     */
    public static function make(mixed $window, ?int $nowMs = null): ?self
    {
        if (! is_string($window) || ! array_key_exists($window, self::WINDOWS)) {
            return null;
        }

        $nowMs ??= self::nowMs();
        $hours = self::WINDOWS[$window];
        $duration = $hours * 60 * 60 * 1000;

        return new self(
            window: $window,
            hours: $hours,
            start: $nowMs - $duration,
            end: $nowMs,
            previousStart: $nowMs - $duration * 2,
            bucketMs: intdiv($duration, self::BUCKET_COUNT),
        );
    }

    /**
     * The current time in Unix milliseconds (`Date.now()`). Uses Carbon so tests can freeze time.
     */
    public static function nowMs(): int
    {
        return now()->getTimestampMs();
    }
}
