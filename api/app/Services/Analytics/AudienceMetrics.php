<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Port of the old A4 repeat-audience service (`services/audience.service.js`).
 *
 * Identity contract: `visitorId` is a project-scoped HMAC of a first-party cookie token,
 * stored as a non-empty string. Missing, null, empty or whitespace-only values are historical
 * unidentified clicks and never count as a visitor.
 *
 * Population: lifetime scope (no date filter) and all clicks including bots, matching the
 * loyalty and network-effect denominators. Visitor IDs are grouped inside MongoDB and are
 * never returned to PHP or to clients.
 */
class AudienceMetrics
{
    public const IDENTITY_METHOD = 'first-party-cookie-v1';

    /**
     * Whether a stored visitorId counts as identified (trimmed non-empty string).
     */
    public static function isIdentifiedVisitorId(mixed $value): bool
    {
        return is_string($value) && preg_match('/(*UCP)\S/u', $value) === 1;
    }

    /**
     * Derive repeat-audience metrics from additive counts. Zero denominators yield zero.
     *
     * @return array{identifiedClicks: int, unidentifiedClicks: int, uniqueVisitors: int, repeatVisitors: int, repeatVisitorPercent: float, clicksPerVisitor: float, identityCoveragePercent: float, identityMethod: string}
     */
    public static function summarize(int $totalClicks = 0, int $identifiedClicks = 0, int $uniqueVisitors = 0, int $repeatVisitors = 0): array
    {
        return [
            'identifiedClicks' => $identifiedClicks,
            'unidentifiedClicks' => max(0, $totalClicks - $identifiedClicks),
            'uniqueVisitors' => $uniqueVisitors,
            'repeatVisitors' => $repeatVisitors,
            'repeatVisitorPercent' => $uniqueVisitors > 0 ? JsNumber::round1(($repeatVisitors / $uniqueVisitors) * 100) : 0,
            'clicksPerVisitor' => $uniqueVisitors > 0 ? JsNumber::round2($identifiedClicks / $uniqueVisitors) : 0,
            'identityCoveragePercent' => $totalClicks > 0 ? JsNumber::round1(($identifiedClicks / $totalClicks) * 100) : 0,
            'identityMethod' => self::IDENTITY_METHOD,
        ];
    }

    /**
     * Per-platform uniqueness ratio: uniqueVisitors / identifiedClicks, two decimals, 0 when empty.
     * This is deliberately not a loyalty or repeat-frequency figure.
     */
    public static function platformVisitorFraction(int $uniqueVisitors, int $identifiedClicks): float|int
    {
        return $identifiedClicks > 0 ? JsNumber::round2($uniqueVisitors / $identifiedClicks) : 0;
    }

    /**
     * Audience row for a platform with no clicks in scope.
     *
     * @return array{identifiedClicks: int, unidentifiedClicks: int, uniqueVisitors: int, uniqueVisitorFraction: int, identityCoveragePercent: int, identityMethod: string}
     */
    public static function emptyPlatformAudience(): array
    {
        return [
            'identifiedClicks' => 0,
            'unidentifiedClicks' => 0,
            'uniqueVisitors' => 0,
            'uniqueVisitorFraction' => 0,
            'identityCoveragePercent' => 0,
            'identityMethod' => self::IDENTITY_METHOD,
        ];
    }

    /**
     * Key used to index per-platform rows (platforms may be null).
     */
    public static function platformKey(mixed $platform): string
    {
        return $platform === null ? "\0null" : 's:'.(is_scalar($platform) ? (string) $platform : json_encode($platform));
    }

    /**
     * Repeat-audience metrics for a project/link scope.
     *
     * @param  array{project: ObjectId, link?: ObjectId}  $match
     * @return array<string, int|float|string>
     */
    public function forScope(array $match): array
    {
        $clicks = Collections::clicks();
        $totalClicks = $clicks->countDocuments($match);

        $grouped = $clicks->aggregate([
            ['$match' => [...$match, '$expr' => self::identifiedExpression('$visitorId')]],
            ['$group' => ['_id' => '$visitorId', 'clicks' => ['$sum' => 1]]],
            ['$group' => [
                '_id' => null,
                'uniqueVisitors' => ['$sum' => 1],
                'identifiedClicks' => ['$sum' => '$clicks'],
                'repeatVisitors' => ['$sum' => ['$cond' => [['$gte' => ['$clicks', 2]], 1, 0]]],
            ]],
        ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray();

        $identified = $grouped[0] ?? [];

        return self::summarize(
            totalClicks: $totalClicks,
            identifiedClicks: (int) ($identified['identifiedClicks'] ?? 0),
            uniqueVisitors: (int) ($identified['uniqueVisitors'] ?? 0),
            repeatVisitors: (int) ($identified['repeatVisitors'] ?? 0),
        );
    }

    /**
     * Per-platform audience metrics, keyed by {@see platformKey()}.
     *
     * @param  array{project: ObjectId, link?: ObjectId}  $match
     * @return array<string, array<string, int|float|string>>
     */
    public function perPlatform(array $match): array
    {
        $rows = Collections::clicks()->aggregate([
            ['$match' => $match],
            ['$lookup' => ['from' => 'links', 'localField' => 'link', 'foreignField' => '_id', 'as' => 'linkData']],
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => false]],
            ['$group' => [
                '_id' => ['platform' => '$linkData.platform', 'visitorId' => '$visitorId'],
                'clicks' => ['$sum' => 1],
            ]],
            ['$group' => [
                '_id' => '$_id.platform',
                'totalClicks' => ['$sum' => '$clicks'],
                'identifiedClicks' => ['$sum' => ['$cond' => [self::identifiedExpression('$_id.visitorId'), '$clicks', 0]]],
                'uniqueVisitors' => ['$sum' => ['$cond' => [self::identifiedExpression('$_id.visitorId'), 1, 0]]],
            ]],
        ], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']]);

        $byPlatform = [];

        foreach ($rows as $row) {
            $identifiedClicks = (int) ($row['identifiedClicks'] ?? 0);
            $totalClicks = (int) ($row['totalClicks'] ?? 0);
            $uniqueVisitors = (int) ($row['uniqueVisitors'] ?? 0);

            $byPlatform[self::platformKey($row['_id'] ?? null)] = [
                'identifiedClicks' => $identifiedClicks,
                'unidentifiedClicks' => max(0, $totalClicks - $identifiedClicks),
                'uniqueVisitors' => $uniqueVisitors,
                'uniqueVisitorFraction' => self::platformVisitorFraction($uniqueVisitors, $identifiedClicks),
                'identityCoveragePercent' => $totalClicks > 0 ? JsNumber::round1(($identifiedClicks / $totalClicks) * 100) : 0,
                'identityMethod' => self::IDENTITY_METHOD,
            ];
        }

        return $byPlatform;
    }

    /**
     * Aggregation predicate for an identified visitor ID: a string with a non-empty trim.
     *
     * @return array<string, mixed>
     */
    protected static function identifiedExpression(string $field): array
    {
        return ['$and' => [
            ['$eq' => [['$type' => $field], 'string']],
            ['$gt' => [['$strLenCP' => ['$trim' => ['input' => $field]]], 0]],
        ]];
    }
}
