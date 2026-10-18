<?php

namespace App\Services\Analytics;

use Illuminate\Http\Exceptions\HttpResponseException;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * Port of the old `controllers/overview.controller.js` (`GET /analytics/overview`).
 *
 * Summarises the user's projects, optionally scoped to one project, campaign or link, for a
 * rolling 24h, 7d or 30d window. Human traffic is `isBot != true`; bots are counted
 * separately. Visitors are distinct (project, visitorId) pairs among identified clicks.
 * The heatmap buckets by UTC day and hour of `clickedAt`.
 */
class AnalyticsOverview
{
    public const INVALID_QUERY_MESSAGE = 'Use valid IDs and a window of 24h, 7d, or 30d.';

    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    /**
     * Build the overview body for a user from the request query parameters.
     *
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     *
     * @throws HttpResponseException
     */
    public function forUser(ObjectId $owner, array $query): array
    {
        $period = PerformanceWindow::make(array_key_exists('window', $query) ? $query['window'] : '30d');
        $ids = [];

        foreach (['projectId', 'campaignId', 'linkId'] as $key) {
            if (array_key_exists($key, $query) && ! ClickScope::isStrictObjectIdString($query[$key])) {
                throw ProjectAccess::failure(400, self::INVALID_QUERY_MESSAGE);
            }

            $ids[$key] = isset($query[$key]) ? new ObjectId($query[$key]) : null;
        }

        if ($period === null) {
            throw ProjectAccess::failure(400, self::INVALID_QUERY_MESSAGE);
        }

        $projects = Collections::projects()->find(
            ['owner' => $owner, ...($ids['projectId'] ? ['_id' => $ids['projectId']] : [])],
            ['projection' => ['_id' => 1, 'clientName' => 1], ...self::ARRAY_TYPE_MAP],
        )->toArray();

        if ($ids['projectId'] && $projects === []) {
            throw ProjectAccess::failure(404, 'Project not found.');
        }

        $scope = ['project' => ['$in' => array_column($projects, '_id')]];
        $scopedCampaign = $ids['campaignId'];

        if ($ids['campaignId']) {
            $campaign = Collections::campaigns()->findOne(
                ['_id' => $ids['campaignId'], ...$scope],
                ['projection' => ['project' => 1], ...self::ARRAY_TYPE_MAP],
            );

            if ($campaign === null) {
                throw ProjectAccess::failure(404, 'Campaign not found.');
            }

            $projects = self::onlyProject($projects, $campaign['project'] ?? null);
            $scope['project'] = ['$in' => array_column($projects, '_id')];
            $scope['campaign'] = $ids['campaignId'];
        }

        if ($ids['linkId']) {
            $link = Collections::links()->findOne(
                ['_id' => $ids['linkId'], ...$scope],
                ['projection' => ['project' => 1, 'campaign' => 1], ...self::ARRAY_TYPE_MAP],
            );

            if ($link === null) {
                throw ProjectAccess::failure(404, 'Link not found.');
            }

            $projects = self::onlyProject($projects, $link['project'] ?? null);
            $scope['project'] = ['$in' => array_column($projects, '_id')];
            $scopedCampaign = $link['campaign'] ?? null;
            $scope['campaign'] = $link['campaign'] ?? null;
            $scope['link'] = $ids['linkId'];
        }

        $projectIds = array_column($projects, '_id');
        $data = $this->aggregate($scope, $period);

        $campaigns = Collections::campaigns()->find(
            ['project' => ['$in' => $projectIds], ...($scopedCampaign !== null ? ['_id' => $scopedCampaign] : [])],
            ['projection' => ['_id' => 1, 'title' => 1, 'project' => 1], ...self::ARRAY_TYPE_MAP],
        )->toArray();

        $links = Collections::links()->find(
            [
                'project' => ['$in' => $projectIds],
                ...($scopedCampaign !== null ? ['campaign' => $scopedCampaign] : []),
                ...($ids['linkId'] ? ['_id' => $ids['linkId']] : []),
            ],
            ['projection' => ['_id' => 1, 'isActive' => 1], ...self::ARRAY_TYPE_MAP],
        )->toArray();

        $summary = $data['summary'][0] ?? ['clicks' => 0, 'bots' => 0, 'previous' => 0];
        $visitors = $data['visitors'][0] ?? ['count' => 0, 'returning' => 0, 'identifiedClicks' => 0];
        $trendCounts = [];
        $trendBotCounts = [];

        foreach ($data['trend'] as $row) {
            $trendCounts[(string) $row['_id']] = $row['count'];
            $trendBotCounts[(string) $row['_id']] = $row['botCount'];
        }

        $campaignTitles = [];

        foreach ($campaigns as $campaign) {
            $campaignTitles[(string) $campaign['_id']] ??= $campaign['title'] ?? null;
        }

        return [
            'window' => $period->window,
            'start' => Bson::isoDate($period->start),
            'end' => Bson::isoDate($period->end),
            'summary' => [
                'clicks' => $summary['clicks'],
                'previousClicks' => $summary['previous'],
                'botClicks' => $summary['bots'],
                'visitors' => $visitors['count'],
                'returningVisitors' => $visitors['returning'],
                'identifiedClicks' => $visitors['identifiedClicks'],
                'projects' => count($projects),
                'campaigns' => count($campaigns),
                'links' => count($links),
                'activeLinks' => count(array_filter($links, fn (array $link): bool => self::isTruthy($link['isActive'] ?? null))),
            ],
            'trend' => array_map(fn (int $bucket): array => [
                'date' => Bson::isoDate($period->start + $bucket * $period->bucketMs),
                'count' => $trendCounts[(string) $bucket] ?? 0,
                'botCount' => $trendBotCounts[(string) $bucket] ?? 0,
            ], range(0, PerformanceWindow::BUCKET_COUNT - 1)),
            'countries' => self::breakdown($data['countries']),
            'devices' => self::breakdown($data['devices']),
            'browsers' => self::breakdown($data['browsers']),
            'sources' => self::breakdown($data['sources']),
            'platforms' => self::breakdown($data['platforms']),
            'projects' => self::ranked($projects, $data['projectClicks'], 'clientName'),
            'campaigns' => self::ranked($campaigns, $data['campaignClicks'], 'title'),
            'heatmap' => array_map(fn (array $row): array => [
                'day' => $row['_id']['day'] - 1,
                'hour' => $row['_id']['hour'],
                'count' => $row['count'],
            ], $data['heatmap']),
            'recent' => array_map(fn (array $row): array => [
                ...Bson::normalize($row),
                'campaignTitle' => isset($row['campaign']) ? ($campaignTitles[(string) $row['campaign']] ?? 'Campaign') : 'Campaign',
            ], $data['recent']),
        ];
    }

    /**
     * The `$facet` aggregation over the current and previous windows.
     *
     * @param  array<string, mixed>  $scope
     * @return array<string, list<array<string, mixed>>>
     */
    protected function aggregate(array $scope, PerformanceWindow $period): array
    {
        $start = new UTCDateTime($period->start);
        $current = ['clickedAt' => ['$gte' => $start], 'isBot' => ['$ne' => true]];

        $named = fn (mixed $field, int $limit = 10): array => [
            ['$match' => $current],
            ['$group' => ['_id' => $field, 'count' => ['$sum' => 1]]],
            ['$sort' => ['count' => -1, '_id' => 1]],
            ...($limit > 0 ? [['$limit' => $limit]] : []),
        ];

        $inCurrentWindow = ['$gte' => ['$clickedAt', $start]];

        $result = Collections::clicks()->aggregate([
            ['$match' => [
                ...$scope,
                'clickedAt' => ['$gte' => new UTCDateTime($period->previousStart), '$lt' => new UTCDateTime($period->end)],
            ]],
            ['$facet' => [
                'summary' => [
                    ['$group' => [
                        '_id' => null,
                        'clicks' => ['$sum' => ['$cond' => [['$and' => [$inCurrentWindow, ['$ne' => ['$isBot', true]]]], 1, 0]]],
                        'bots' => ['$sum' => ['$cond' => [['$and' => [$inCurrentWindow, ['$eq' => ['$isBot', true]]]], 1, 0]]],
                        'previous' => ['$sum' => ['$cond' => [['$and' => [['$lt' => ['$clickedAt', $start]], ['$ne' => ['$isBot', true]]]], 1, 0]]],
                    ]],
                ],
                'visitors' => [
                    ['$match' => [...$current, 'visitorId' => ['$type' => 'string', '$ne' => '']]],
                    ['$group' => ['_id' => ['project' => '$project', 'visitor' => '$visitorId'], 'clicks' => ['$sum' => 1]]],
                    ['$group' => [
                        '_id' => null,
                        'count' => ['$sum' => 1],
                        'returning' => ['$sum' => ['$cond' => [['$gt' => ['$clicks', 1]], 1, 0]]],
                        'identifiedClicks' => ['$sum' => '$clicks'],
                    ]],
                ],
                'trend' => [
                    ['$match' => ['clickedAt' => ['$gte' => $start]]],
                    ['$group' => [
                        '_id' => ['$floor' => ['$divide' => [['$subtract' => ['$clickedAt', $start]], $period->bucketMs]]],
                        'count' => ['$sum' => ['$cond' => [['$eq' => ['$isBot', true]], 0, 1]]],
                        'botCount' => ['$sum' => ['$cond' => [['$eq' => ['$isBot', true]], 1, 0]]],
                    ]],
                ],
                'countries' => $named(['$ifNull' => ['$geo.country', 'Unknown']]),
                'devices' => $named(['$ifNull' => ['$device.type', 'unknown']]),
                'browsers' => $named(['$ifNull' => ['$browser.name', 'Unknown']]),
                'sources' => $named(['$cond' => [
                    ['$in' => [['$ifNull' => ['$referrer', '']], ['', null]]],
                    'Direct / unknown',
                    '$referrer',
                ]]),
                'campaignClicks' => $named('$campaign', 0),
                'projectClicks' => $named('$project', 0),
                'platforms' => [
                    ...$named('$link', 0),
                    ['$lookup' => ['from' => 'links', 'localField' => '_id', 'foreignField' => '_id', 'as' => 'link']],
                    ['$group' => [
                        '_id' => ['$ifNull' => [['$arrayElemAt' => ['$link.platform', 0]], 'other']],
                        'count' => ['$sum' => '$count'],
                    ]],
                    ['$sort' => ['count' => -1]],
                ],
                'heatmap' => [
                    ['$match' => $current],
                    ['$group' => [
                        '_id' => ['day' => ['$dayOfWeek' => '$clickedAt'], 'hour' => ['$hour' => '$clickedAt']],
                        'count' => ['$sum' => 1],
                    ]],
                ],
                'recent' => [
                    ['$match' => $current],
                    ['$sort' => ['clickedAt' => -1, '_id' => -1]],
                    ['$limit' => 20],
                    ['$project' => [
                        '_id' => 1,
                        'clickedAt' => 1,
                        'campaign' => 1,
                        'country' => '$geo.country',
                        'device' => '$device.type',
                        'browser' => '$browser.name',
                    ]],
                ],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        return $result[0];
    }

    /**
     * Keep only the project a campaign or link belongs to.
     *
     * @param  list<array<string, mixed>>  $projects
     * @return list<array<string, mixed>>
     */
    protected static function onlyProject(array $projects, mixed $projectId): array
    {
        return array_values(array_filter(
            $projects,
            fn (array $project): bool => (string) $project['_id'] === (string) $projectId,
        ));
    }

    /**
     * Rows of `{ name, count }` from a grouped facet (`String(row._id)`).
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{name: string, count: int}>
     */
    protected static function breakdown(array $rows): array
    {
        return array_map(fn (array $row): array => [
            'name' => self::jsString($row['_id'] ?? null),
            'count' => $row['count'],
        ], $rows);
    }

    /**
     * Every project or campaign with its click count, most clicks first (stable for ties).
     *
     * @param  list<array<string, mixed>>  $items
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{id: string, name: mixed, count: int}>
     */
    protected static function ranked(array $items, array $rows, string $label): array
    {
        $counts = [];

        foreach ($rows as $row) {
            $counts[self::jsString($row['_id'] ?? null)] ??= $row['count'];
        }

        $ranked = array_map(fn (array $item): array => [
            'id' => (string) $item['_id'],
            'name' => Bson::normalize($item[$label] ?? null),
            'count' => $counts[(string) $item['_id']] ?? 0,
        ], $items);

        usort($ranked, fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        return $ranked;
    }

    /**
     * JavaScript `String(value)` for grouped `_id` values.
     */
    protected static function jsString(mixed $value): string
    {
        return match (true) {
            $value === null => 'null',
            is_bool($value) => $value ? 'true' : 'false',
            is_float($value) => (string) json_encode($value),
            $value instanceof ObjectId, is_scalar($value) => (string) $value,
            default => (string) json_encode(Bson::normalize($value)),
        };
    }

    /**
     * JavaScript truthiness for `isActive`.
     */
    protected static function isTruthy(mixed $value): bool
    {
        return ! in_array($value, [null, false, 0, 0.0, ''], true);
    }
}
