<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Decay curve and long tail for a click scope.
 *
 * A click's "age" is the whole number of days between the link it came from being published
 * (`links.createdAt`, joined with a `$lookup`) and the click's `clickedAt`, floored and clamped
 * at 0 (a click can never be negative days old). Only human clicks (`isBot === false`) count,
 * and clicks whose link no longer exists are dropped by the join.
 *
 * {@see compute()} returns a zero-filled curve for days 0..`days - 1` plus the shape stats:
 * `halfLifeDays` is the smallest day whose cumulative click count reaches 50% of all human
 * clicks, and `p90Days` the same at 90%. Both are computed over the full age distribution, so a
 * click older than the plotted curve still counts toward the totals, the `after*` shares and the
 * day on which the threshold is crossed; it simply has no bar in `curve`. `peakDay` is the age
 * with the most clicks (smallest age on a tie). `shareAfterDayN` is the percentage of human
 * clicks at least N days old, `tailClicks` the count at least 7 days old, and `evergreen` is
 * `shareAfterDay7 >= config('sponsor.decay.evergreen_threshold')`.
 *
 * `links` holds the top 25 links by human clicks with their own half-life and day-7 share.
 *
 * No `ip`, `visitorId` or `visitorVersion` is ever projected out of MongoDB.
 *
 * @phpstan-type ClickMatch array{project: ObjectId, link?: ObjectId, campaign?: ObjectId}
 * @phpstan-type Histogram array<int, int>
 */
class DecayCurve
{
    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    protected const DAY_MS = 24 * 60 * 60 * 1000;

    /**
     * Build the decay curve payload for a click scope.
     *
     * @param  ClickMatch  $match
     * @return array{humanClicks: int, days: int, curve: list<array<string, mixed>>, halfLifeDays: int|null, p90Days: int|null, peakDay: int|null, shareAfterDay7: int|float, shareAfterDay30: int|float, tailClicks: int, evergreen: bool, links: list<array<string, mixed>>}
     */
    public function compute(array $match, int $days = 90): array
    {
        $histogram = $this->ageHistogram($match);
        $threshold = (int) config('sponsor.decay.evergreen_threshold', 30);

        return [
            ...self::summarize($histogram, $days, $threshold),
            'links' => $this->linkRows($match),
        ];
    }

    /**
     * Turn a `[ageInDays => clicks]` histogram into the curve and shape statistics.
     *
     * Pure arithmetic: no database access, so the sponsor report and tests can call it directly.
     *
     * @param  Histogram  $histogram
     * @return array{humanClicks: int, days: int, curve: list<array<string, mixed>>, halfLifeDays: int|null, p90Days: int|null, peakDay: int|null, shareAfterDay7: int|float, shareAfterDay30: int|float, tailClicks: int, evergreen: bool}
     */
    public static function summarize(array $histogram, int $days, int $evergreenThreshold = 30): array
    {
        ksort($histogram);
        $total = array_sum($histogram);

        $curve = [];
        $cumulative = 0;

        for ($day = 0; $day < $days; $day++) {
            $clicks = $histogram[$day] ?? 0;
            $cumulative += $clicks;

            $curve[] = [
                'day' => $day,
                'clicks' => $clicks,
                'cumulative' => $cumulative,
                'cumulativeShare' => $total === 0 ? 0.0 : JsNumber::toFixed(($cumulative / $total) * 100, 1),
            ];
        }

        $shareAfterDay7 = self::shareAfterDay($histogram, $total, 7);

        return [
            'humanClicks' => $total,
            'days' => $days,
            'curve' => $curve,
            'halfLifeDays' => self::thresholdDay($histogram, $total, 0.5),
            'p90Days' => self::thresholdDay($histogram, $total, 0.9),
            'peakDay' => self::peakDay($histogram),
            'shareAfterDay7' => $shareAfterDay7,
            'shareAfterDay30' => self::shareAfterDay($histogram, $total, 30),
            'tailClicks' => self::clicksAtOrAfter($histogram, 7),
            'evergreen' => $shareAfterDay7 >= $evergreenThreshold,
        ];
    }

    /**
     * Human click ages over the whole scope, bucketed by whole days since the link was published.
     *
     * @param  ClickMatch  $match
     * @return Histogram
     */
    protected function ageHistogram(array $match): array
    {
        $rows = Collections::clicks()->aggregate([
            ['$match' => [...$match, 'isBot' => false]],
            self::linkLookup(),
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => false]],
            ['$project' => ['ageDays' => self::ageDaysExpression()]],
            ['$group' => ['_id' => '$ageDays', 'clicks' => ['$sum' => 1]]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        $histogram = [];

        foreach ($rows as $row) {
            $histogram[(int) $row['_id']] = (int) $row['clicks'];
        }

        ksort($histogram);

        return $histogram;
    }

    /**
     * Per-link rows for the top 25 links by human clicks.
     *
     * @param  ClickMatch  $match
     * @return list<array<string, mixed>>
     */
    protected function linkRows(array $match): array
    {
        $rows = Collections::clicks()->aggregate([
            ['$match' => [...$match, 'isBot' => false]],
            self::linkLookup(),
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => false]],
            ['$project' => ['link' => '$link', 'ageDays' => self::ageDaysExpression()]],
            ['$group' => [
                '_id' => ['link' => '$link', 'ageDays' => '$ageDays'],
                'clicks' => ['$sum' => 1],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        /** @var array<string, Histogram> $histograms */
        $histograms = [];

        foreach ($rows as $row) {
            $link = $row['_id']['link'] ?? null;

            if (! $link instanceof ObjectId) {
                continue;
            }

            $key = (string) $link;
            $day = (int) $row['_id']['ageDays'];
            $histograms[$key][$day] = ($histograms[$key][$day] ?? 0) + (int) $row['clicks'];
        }

        if ($histograms === []) {
            return [];
        }

        $totals = array_map(array_sum(...), $histograms);

        uksort($histograms, fn (string $a, string $b): int => ($totals[$b] <=> $totals[$a]) ?: strcmp($a, $b));

        $top = array_slice(array_keys($histograms), 0, 25);
        $documents = $this->linkDocuments($top);

        $links = [];

        foreach ($top as $key) {
            $histogram = $histograms[$key];
            $total = $totals[$key];
            $document = $documents[$key] ?? null;

            $links[] = [
                'link' => $key,
                'title' => $document !== null ? Bson::normalize($document['title'] ?? null) : null,
                'platform' => $document !== null ? Bson::normalize($document['platform'] ?? null) : null,
                'publishedAt' => $document !== null ? Bson::normalize($document['createdAt'] ?? null) : null,
                'humanClicks' => $total,
                'halfLifeDays' => self::thresholdDay($histogram, $total, 0.5),
                'shareAfterDay7' => self::shareAfterDay($histogram, $total, 7),
            ];
        }

        return $links;
    }

    /**
     * Fetch the link documents for the given hex ids, keyed by hex id.
     *
     * @param  list<string>  $ids
     * @return array<string, array<string, mixed>>
     */
    protected function linkDocuments(array $ids): array
    {
        $objectIds = array_map(fn (string $id): ObjectId => new ObjectId($id), $ids);

        $documents = [];

        foreach (Collections::links()->find(['_id' => ['$in' => $objectIds]], self::ARRAY_TYPE_MAP) as $document) {
            $documents[(string) $document['_id']] = $document;
        }

        return $documents;
    }

    /**
     * Whole days between the link's publish time and the click, floored and clamped at 0.
     *
     * A missing link `createdAt` falls back to the click time, so the age is 0.
     *
     * @return array<string, mixed>
     */
    protected static function ageDaysExpression(): array
    {
        $milliseconds = ['$subtract' => [
            '$clickedAt',
            ['$ifNull' => ['$linkData.createdAt', '$clickedAt']],
        ]];

        return ['$max' => [['$floor' => ['$divide' => [$milliseconds, self::DAY_MS]]], 0]];
    }

    /**
     * The smallest day whose cumulative clicks reach `fraction` of the total, or null when empty.
     *
     * @param  Histogram  $histogram  Sorted ascending by day.
     */
    protected static function thresholdDay(array $histogram, int $total, float $fraction): ?int
    {
        if ($total === 0) {
            return null;
        }

        ksort($histogram);
        $target = $fraction * $total;
        $cumulative = 0;

        foreach ($histogram as $day => $clicks) {
            $cumulative += $clicks;

            if ($cumulative >= $target) {
                return $day;
            }
        }

        return null;
    }

    /**
     * The day with the most clicks, smallest day on a tie, or null when empty.
     *
     * @param  Histogram  $histogram
     */
    protected static function peakDay(array $histogram): ?int
    {
        $peak = null;
        $max = -1;

        foreach ($histogram as $day => $clicks) {
            if ($clicks > $max) {
                $max = $clicks;
                $peak = $day;
            }
        }

        return $peak;
    }

    /**
     * Percentage of human clicks at least `$days` old, one decimal (0 when empty).
     *
     * @param  Histogram  $histogram
     */
    protected static function shareAfterDay(array $histogram, int $total, int $days): float
    {
        if ($total === 0) {
            return 0.0;
        }

        return JsNumber::toFixed((self::clicksAtOrAfter($histogram, $days) / $total) * 100, 1);
    }

    /**
     * Clicks at least `$days` old.
     *
     * @param  Histogram  $histogram
     */
    protected static function clicksAtOrAfter(array $histogram, int $days): int
    {
        $sum = 0;

        foreach ($histogram as $day => $clicks) {
            if ($day >= $days) {
                $sum += $clicks;
            }
        }

        return $sum;
    }

    /**
     * `$lookup` stage joining each click to its link as `linkData`.
     *
     * @return array<string, mixed>
     */
    protected static function linkLookup(): array
    {
        return ['$lookup' => ['from' => 'links', 'localField' => 'link', 'foreignField' => '_id', 'as' => 'linkData']];
    }
}
