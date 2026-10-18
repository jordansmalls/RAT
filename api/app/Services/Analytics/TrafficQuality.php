<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Assign every scoped click to the first matching bucket: bot, unclassified, burst,
 * duplicate, unidentified, verified. Only an explicit boolean false is human.
 *
 * Identity is a non-blank string visitorId, otherwise a non-blank string IP, otherwise
 * null. Whitespace-only identities are absent; valid identities retain their stored value.
 * Burst gaps are inclusive (<= the configured seconds), measured against the immediately
 * previous scoped click on the same link and identity, including bot/legacy clicks.
 * Timestamp ties use ascending ObjectId order. A null identity is never burst/duplicate.
 * The duplicate window sorts one compound date/ID value because $documentNumber accepts
 * exactly one sort field.
 *
 * Duplicate rank counts only non-burst human clicks, across the lifetime of the supplied
 * scope for each link and identity. Bots, legacy clicks and burst repeats do not consume
 * the allowance. Rank N+1 and later are duplicates; the first N remain verified.
 *
 * Verified share = (verified + unidentified) / all scoped clicks * 100, rounded to one
 * decimal before grading. Distinct non-blank visitorIds among verified clicks are counted
 * across links inside MongoDB. IP fallback does not count toward unique verified visitors.
 * No private identities leave the pipeline, only per-bucket counts and date bounds.
 */
class TrafficQuality
{
    protected const BUCKETS = ['bot', 'unclassified', 'burst', 'duplicate', 'unidentified', 'verified'];

    /**
     * @param  array{project?: ObjectId, link?: ObjectId, campaign?: ObjectId}  $match
     * @return array<string, mixed>
     */
    public function compute(array $match): array
    {
        $config = config('sponsor.traffic_quality');
        $window = (int) $config['burst_window_seconds'];
        $limit = (int) $config['max_clicks_per_visitor_per_link'];
        $rows = Collections::clicks()->aggregate([
            ['$match' => $match],
            ['$set' => [
                '_tqVisitor' => self::nonBlankString('$visitorId'),
                '_tqIp' => self::nonBlankString('$ip'),
                '_tqOrder' => ['at' => '$clickedAt', 'id' => '$_id'],
            ]],
            ['$set' => ['_tqKey' => ['$ifNull' => ['$_tqVisitor', '$_tqIp']]]],
            ['$setWindowFields' => [
                'partitionBy' => ['link' => '$link', 'visitor' => '$_tqKey'],
                'sortBy' => ['clickedAt' => 1, '_id' => 1],
                'output' => ['_tqPrevious' => ['$shift' => ['output' => '$clickedAt', 'by' => -1, 'default' => null]]],
            ]],
            ['$set' => ['_tqBaseBucket' => ['$switch' => [
                'branches' => [
                    ['case' => ['$eq' => ['$isBot', true]], 'then' => 'bot'],
                    ['case' => ['$ne' => [['$ifNull' => ['$isBot', null]], false]], 'then' => 'unclassified'],
                    ['case' => ['$and' => [
                        ['$ne' => ['$_tqKey', null]],
                        ['$ne' => ['$_tqPrevious', null]],
                        ['$lte' => [['$subtract' => ['$clickedAt', '$_tqPrevious']], $window * 1000]],
                    ]], 'then' => 'burst'],
                    ['case' => ['$eq' => ['$_tqKey', null]], 'then' => 'unidentified'],
                ],
                'default' => 'verified',
            ]]]],
            ['$setWindowFields' => [
                'partitionBy' => [
                    'link' => '$link', 'visitor' => '$_tqKey',
                    'eligible' => ['$eq' => ['$_tqBaseBucket', 'verified']],
                ],
                'sortBy' => ['_tqOrder' => 1],
                'output' => ['_tqRank' => ['$documentNumber' => (object) []]],
            ]],
            ['$set' => ['_tqBucket' => ['$cond' => [
                ['$and' => [
                    ['$eq' => ['$_tqBaseBucket', 'verified']],
                    ['$gt' => ['$_tqRank', $limit]],
                ]],
                'duplicate', '$_tqBaseBucket',
            ]]]],
            ['$group' => [
                '_id' => [
                    'bucket' => '$_tqBucket',
                    'visitor' => ['$cond' => [['$eq' => ['$_tqBucket', 'verified']], '$_tqVisitor', null]],
                ],
                'clicks' => ['$sum' => 1],
                'from' => ['$min' => '$clickedAt'],
                'to' => ['$max' => '$clickedAt'],
            ]],
            ['$group' => [
                '_id' => '$_id.bucket',
                'clicks' => ['$sum' => '$clicks'],
                'uniqueVerifiedVisitors' => ['$sum' => ['$cond' => [['$ne' => ['$_id.visitor', null]], 1, 0]]],
                'from' => ['$min' => '$from'],
                'to' => ['$max' => '$to'],
            ]],
        ], ['allowDiskUse' => true, 'typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray();

        $counts = array_fill_keys(self::BUCKETS, 0);
        $uniqueVisitors = 0;
        $from = null;
        $to = null;

        foreach ($rows as $row) {
            $counts[$row['_id']] = (int) $row['clicks'];
            $uniqueVisitors += (int) $row['uniqueVerifiedVisitors'];
            $rowFrom = Bson::normalize($row['from']);
            $rowTo = Bson::normalize($row['to']);
            $from = $from === null || $rowFrom < $from ? $rowFrom : $from;
            $to = $to === null || $rowTo > $to ? $rowTo : $to;
        }

        $total = array_sum($counts);
        $verified = $counts['verified'] + $counts['unidentified'];
        $share = $total > 0 ? JsNumber::toFixed($verified / $total * 100, 1) : 0;

        return [
            'totalClicks' => $total,
            'verifiedHumanClicks' => $verified,
            'verifiedShare' => $share,
            'uniqueVerifiedVisitors' => $uniqueVisitors,
            'grade' => $total > 0 ? self::grade($share, $config['grade_thresholds']) : null,
            'buckets' => array_map(fn (string $reason): array => [
                'reason' => $reason,
                'label' => $config['buckets'][$reason]['label'],
                'clicks' => $counts[$reason],
                'share' => $total > 0 ? JsNumber::toFixed($counts[$reason] / $total * 100, 1) : 0,
                'filtered' => ! in_array($reason, ['unidentified', 'verified'], true),
                'description' => $config['buckets'][$reason]['description'],
            ], self::BUCKETS),
            'methodology' => [
                'Bot user agents are flagged at redirect time by the case-insensitive expression bot|crawler|spider|crawling; this is a heuristic, not proof of a real person.',
                'Only clicks explicitly marked non-bot are human; missing, null or invalid bot flags are unclassified.',
                'Rules run in order: bot, unclassified, burst, duplicate, unidentified, verified. Each click belongs to exactly one bucket.',
                "Burst repeats occur at most {$window} seconds after the immediately previous scoped click on the same link and identity, including bot and legacy clicks. Timestamp ties use ascending click ID order.",
                "Only the first {$limit} non-burst human clicks per identity and link in the lifetime scope are eligible. Later clicks are duplicates; burst repeats do not consume this allowance.",
                'Identity uses a non-blank cookie visitor identifier, then a non-blank IP address. Clicks without either are unidentified, never burst or duplicate, and count toward verified human clicks.',
                'Unique verified visitors count distinct cookie visitor identifiers on verified clicks across links. IP fallback and unidentified clicks do not add unique visitors. Private identifiers never leave MongoDB.',
                'Verified share includes verified and unidentified clicks divided by all clicks, rounded to one decimal before applying the configured grade thresholds. This certificate describes these filters, not independently audited traffic.',
            ],
            'period' => $total > 0 ? ['from' => $from, 'to' => $to] : null,
            'generatedAt' => Bson::isoDate(now()),
        ];
    }

    /**
     * Inclusive thresholds, evaluated from highest to lowest regardless of config order.
     *
     * @param  array<string, int|float>  $thresholds
     */
    public static function grade(float $share, array $thresholds): string
    {
        arsort($thresholds, SORT_NUMERIC);

        foreach ($thresholds as $grade => $threshold) {
            if ($share >= $threshold) {
                return $grade;
            }
        }

        return 'D';
    }

    /**
     * Preserve non-blank strings; guard $trim with $cond for historical non-string values.
     *
     * @return array<string, mixed>
     */
    protected static function nonBlankString(string $field): array
    {
        return ['$cond' => [
            ['$eq' => [['$type' => $field], 'string']],
            ['$cond' => [['$ne' => [['$trim' => ['input' => $field]], '']], $field, null]],
            null,
        ]];
    }
}
