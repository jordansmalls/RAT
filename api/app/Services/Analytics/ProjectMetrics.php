<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * Port of the per-project metrics in the old `controllers/analytics.controller.js`.
 *
 * Every method takes the validated click match from {@see ClickScope} (project ObjectId plus
 * an optional link ObjectId) and returns the old response body without its `message` key.
 * Pipelines are translated one to one. None of them project `ip`, `visitorId` or
 * `visitorVersion`; distinct IPs and visitors are only ever counted inside MongoDB.
 *
 * @phpstan-type ClickMatch array{project: ObjectId, link?: ObjectId}
 */
class ProjectMetrics
{
    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    protected const DAY_MS = 24 * 60 * 60 * 1000;

    public function __construct(protected AudienceMetrics $audience) {}

    /**
     * Human confidence (0-100, one decimal): clicks with `isBot: false` over all clicks in scope.
     * Missing or null `isBot` counts toward the total but not toward human clicks.
     *
     * @param  ClickMatch  $match
     * @return array{confidence: int|float}
     */
    public function humanConfidence(array $match): array
    {
        $result = Collections::clicks()->aggregate([
            ['$match' => $match],
            ['$group' => [
                '_id' => null,
                'total' => ['$sum' => 1],
                'humanClicks' => ['$sum' => ['$cond' => [['$eq' => ['$isBot', false]], 1, 0]]],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        $total = (int) ($result[0]['total'] ?? 0);

        if ($total === 0) {
            return ['confidence' => 0];
        }

        return ['confidence' => JsNumber::toFixed(((int) $result[0]['humanClicks'] / $total) * 100, 1)];
    }

    /**
     * Click counts per link platform. Clicks whose link no longer exists are dropped by the join.
     *
     * @param  ClickMatch  $match
     * @return array{data: list<mixed>}
     */
    public function clicksPerPlatform(array $match): array
    {
        return ['data' => $this->aggregate([
            ['$match' => $match],
            self::linkLookup(),
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => false]],
            ['$group' => ['_id' => '$linkData.platform', 'count' => ['$sum' => 1]]],
            ['$project' => ['_id' => 0, 'platform' => '$_id', 'count' => 1]],
        ])];
    }

    /**
     * Top 50 countries by clicks.
     *
     * @param  ClickMatch  $match
     * @return array{data: list<mixed>}
     */
    public function globalReach(array $match): array
    {
        return ['data' => $this->aggregate([
            ['$match' => $match],
            ['$group' => ['_id' => '$geo.country', 'count' => ['$sum' => 1]]],
            ['$project' => ['_id' => 0, 'country' => '$_id', 'count' => 1]],
            ['$sort' => ['count' => -1]],
            ['$limit' => 50],
        ])];
    }

    /**
     * Platform efficiency: the deprecated IP-based `intent` (unique IPs / clicks, two decimals)
     * plus the per-platform cookie `audience` object.
     *
     * @param  ClickMatch  $match
     * @return array{data: list<array{platform: mixed, intent: int|float, audience: array<string, mixed>}>}
     */
    public function efficiency(array $match): array
    {
        $rows = Collections::clicks()->aggregate([
            ['$match' => $match],
            self::linkLookup(),
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => false]],
            ['$group' => [
                '_id' => '$linkData.platform',
                'totalClicks' => ['$sum' => 1],
                'uniqueIPs' => ['$addToSet' => '$ip'],
            ]],
            ['$project' => [
                '_id' => 0,
                'platform' => '$_id',
                'intent' => ['$cond' => [
                    'if' => ['$eq' => ['$totalClicks', 0]],
                    'then' => 0,
                    'else' => ['$divide' => [['$size' => '$uniqueIPs'], '$totalClicks']],
                ]],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        $audiences = $this->audience->perPlatform($match);

        return ['data' => array_map(fn (array $row): array => [
            'platform' => Bson::normalize($row['platform'] ?? null),
            'intent' => JsNumber::toFixed($row['intent'], 2),
            'audience' => $audiences[AudienceMetrics::platformKey($row['platform'] ?? null)] ?? AudienceMetrics::emptyPlatformAudience(),
        ], $rows)];
    }

    /**
     * Golden-hour heatmap from the stored `dayOfWeek` and `hourOfDay` fields.
     *
     * @param  ClickMatch  $match
     * @return array{heatmap: list<mixed>}
     */
    public function heatmap(array $match): array
    {
        return ['heatmap' => $this->aggregate([
            ['$match' => $match],
            ['$group' => ['_id' => ['day' => '$dayOfWeek', 'hour' => '$hourOfDay'], 'clicks' => ['$sum' => 1]]],
            ['$project' => ['_id' => 0, 'day' => '$_id.day', 'hour' => '$_id.hour', 'clicks' => 1]],
        ])];
    }

    /**
     * Loyalty: deprecated IP fields (`uniqueIPs`, `totalClicks`, `ratio` = uniqueIPs / clicks,
     * an IP uniqueness fraction and NOT a loyalty score) followed by the cookie audience fields.
     *
     * @param  ClickMatch  $match
     * @return array<string, mixed>
     */
    public function loyalty(array $match): array
    {
        [$totalClicks, $uniqueIps] = $this->clickAndIpCounts($match);

        return [
            'uniqueIPs' => $uniqueIps,
            'totalClicks' => $totalClicks,
            'ratio' => $totalClicks > 0 ? JsNumber::toFixed($uniqueIps / $totalClicks, 2) : 0,
            ...$this->audience->forScope($match),
        ];
    }

    /**
     * Device breakdown as raw counts. An empty scope omits `total`, as the old handler did.
     *
     * @param  ClickMatch  $match
     * @return array<string, int>
     */
    public function deviceBreakdown(array $match): array
    {
        $clicks = Collections::clicks();
        $total = $clicks->countDocuments($match);

        if ($total === 0) {
            return ['mobile' => 0, 'tablet' => 0, 'desktop' => 0];
        }

        return [
            'mobile' => $clicks->countDocuments([...$match, 'device.type' => 'mobile']),
            'tablet' => $clicks->countDocuments([...$match, 'device.type' => 'tablet']),
            'desktop' => $clicks->countDocuments([...$match, 'device.type' => 'desktop']),
            'total' => $total,
        ];
    }

    /**
     * The 10 most recent clicks with geo, device, browser, OS and platform.
     *
     * @param  ClickMatch  $match
     * @return array{data: list<mixed>}
     */
    public function recentActivity(array $match): array
    {
        return ['data' => $this->aggregate([
            ['$match' => $match],
            ['$sort' => ['clickedAt' => -1]],
            ['$limit' => 10],
            self::linkLookup(),
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => true]],
            ['$project' => [
                '_id' => 0,
                'geo' => 1,
                'device' => 1,
                'browser' => 1,
                'os' => 1,
                'platform' => '$linkData.platform',
                'clickedAt' => 1,
            ]],
        ])];
    }

    /**
     * Platform share of all clicks in scope (one decimal). The denominator includes clicks whose
     * link was deleted, so shares can sum below 100.
     *
     * @param  ClickMatch  $match
     * @return array{data: list<array{platform: mixed, share: int|float}>}
     */
    public function platformDominance(array $match): array
    {
        return ['data' => $this->dominanceRows($match)];
    }

    /**
     * Network effect: deprecated IP-derived `uniqueVisitors` and `ratio` (clicks / unique IPs)
     * plus the cookie `audience` object.
     *
     * @param  ClickMatch  $match
     * @return array{totalClicks: int, uniqueVisitors: int, ratio: int|float, audience: array<string, mixed>}
     */
    public function networkEffect(array $match): array
    {
        [$totalClicks, $uniqueIps] = $this->clickAndIpCounts($match);

        return [
            'totalClicks' => $totalClicks,
            'uniqueVisitors' => $uniqueIps,
            'ratio' => $uniqueIps > 0 ? JsNumber::toFixed($totalClicks / $uniqueIps, 2) : 0,
            'audience' => $this->audience->forScope($match),
        ];
    }

    /**
     * Velocity: rolling last 30 days against the 30 days before, as a percentage (one decimal).
     *
     * @param  ClickMatch  $match
     * @return array{growth: int|float}
     */
    public function velocity(array $match): array
    {
        $clicks = Collections::clicks();
        $nowMs = PerformanceWindow::nowMs();
        $now = new UTCDateTime($nowMs);
        $thirtyDaysAgo = new UTCDateTime($nowMs - 30 * self::DAY_MS);
        $sixtyDaysAgo = new UTCDateTime($nowMs - 60 * self::DAY_MS);

        $lastThirtyDays = $clicks->countDocuments([...$match, 'clickedAt' => ['$gte' => $thirtyDaysAgo, '$lte' => $now]]);
        $previousThirtyDays = $clicks->countDocuments([...$match, 'clickedAt' => ['$gte' => $sixtyDaysAgo, '$lt' => $thirtyDaysAgo]]);

        $growth = 0;

        if ($previousThirtyDays > 0) {
            $growth = (($lastThirtyDays - $previousThirtyDays) / $previousThirtyDays) * 100;
        } elseif ($lastThirtyDays > 0) {
            $growth = 100;
        }

        return ['growth' => JsNumber::toFixed($growth, 1)];
    }

    /**
     * The campaign with the most clicks in scope.
     *
     * @param  ClickMatch  $match
     * @return array{campaignId: string|null, title: mixed, clickCount: int}
     */
    public function heroCampaign(array $match): array
    {
        $result = Collections::clicks()->aggregate([
            ['$match' => $match],
            ['$group' => ['_id' => '$campaign', 'clickCount' => ['$sum' => 1]]],
            ['$sort' => ['clickCount' => -1]],
            ['$limit' => 1],
        ], self::ARRAY_TYPE_MAP)->toArray();

        if ($result === []) {
            return ['campaignId' => null, 'title' => null, 'clickCount' => 0];
        }

        $campaignId = $result[0]['_id'] ?? null;
        $campaign = $campaignId instanceof ObjectId
            ? Collections::campaigns()->findOne(['_id' => $campaignId], ['projection' => ['title' => 1], ...self::ARRAY_TYPE_MAP])
            : null;

        return [
            'campaignId' => Bson::normalize($campaignId),
            'title' => $campaign !== null ? Bson::normalize($campaign['title'] ?? null) : null,
            'clickCount' => (int) $result[0]['clickCount'],
        ];
    }

    /**
     * Monthly health: lifetime network effect, dominance and hero campaign plus rolling velocity,
     * computed exactly as the standalone endpoints so both always agree.
     *
     * @param  ClickMatch  $match
     * @return array{networkEffect: array<string, mixed>, dominance: list<array<string, mixed>>, velocity: array{growth: int|float}, heroCampaign: array<string, mixed>}
     */
    public function monthlyHealth(array $match): array
    {
        return [
            'networkEffect' => $this->networkEffect($match),
            'dominance' => $this->dominanceRows($match),
            'velocity' => $this->velocity($match),
            'heroCampaign' => $this->heroCampaign($match),
        ];
    }

    /**
     * Total clicks and distinct IPs in scope. Only the count of IPs leaves this method.
     *
     * @param  ClickMatch  $match
     * @return array{0: int, 1: int}
     */
    protected function clickAndIpCounts(array $match): array
    {
        $clicks = Collections::clicks();

        return [$clicks->countDocuments($match), count($clicks->distinct('ip', $match))];
    }

    /**
     * @param  ClickMatch  $match
     * @return list<array{platform: mixed, share: int|float}>
     */
    protected function dominanceRows(array $match): array
    {
        $total = Collections::clicks()->countDocuments($match);

        if ($total === 0) {
            return [];
        }

        $rows = Collections::clicks()->aggregate([
            ['$match' => $match],
            self::linkLookup(),
            ['$unwind' => ['path' => '$linkData', 'preserveNullAndEmptyArrays' => false]],
            ['$group' => ['_id' => '$linkData.platform', 'count' => ['$sum' => 1]]],
            ['$project' => [
                '_id' => 0,
                'platform' => '$_id',
                'share' => ['$multiply' => [['$divide' => ['$count', $total]], 100]],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        return array_map(fn (array $row): array => [
            'platform' => Bson::normalize($row['platform'] ?? null),
            'share' => JsNumber::toFixed($row['share'], 1),
        ], $rows);
    }

    /**
     * Run a pipeline and normalize the documents for JSON output.
     *
     * @param  list<array<string, mixed>>  $pipeline
     * @return list<mixed>
     */
    protected function aggregate(array $pipeline): array
    {
        return array_map(Bson::normalize(...), Collections::clicks()->aggregate($pipeline)->toArray());
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
