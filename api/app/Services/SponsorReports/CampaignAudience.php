<?php

namespace App\Services\SponsorReports;

use App\Services\Analytics\Collections;
use App\Services\Analytics\JsNumber;
use Carbon\CarbonImmutable;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * Campaign-level aggregates for the sponsor report that the analytics services don't cover:
 * totals and period, per-link human clicks, and the audience block (top countries, device
 * mix, daily human clicks).
 *
 * "Human" is `isBot === false`; missing or null `isBot` is not human. `ip`, `visitorId` and
 * `visitorVersion` are never projected. Shares are % of human clicks in scope, one decimal.
 *
 * @phpstan-type ClickMatch array{project: ObjectId, campaign: ObjectId}
 */
class CampaignAudience
{
    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    /**
     * All clicks, human clicks, and the first and last human click.
     *
     * @param  ClickMatch  $match
     * @return array{totalClicks: int, humanClicks: int, period: array{from: string, to: string}|null}
     */
    public function summary(array $match): array
    {
        $row = Collections::clicks()->aggregate([
            ['$match' => $match],
            ['$group' => [
                '_id' => null,
                'total' => ['$sum' => 1],
                'human' => ['$sum' => ['$cond' => [['$eq' => ['$isBot', false]], 1, 0]]],
                'from' => ['$min' => ['$cond' => [['$eq' => ['$isBot', false]], '$clickedAt', null]]],
                'to' => ['$max' => ['$cond' => [['$eq' => ['$isBot', false]], '$clickedAt', null]]],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray()[0] ?? null;

        $hasPeriod = ($row['from'] ?? null) instanceof UTCDateTime && ($row['to'] ?? null) instanceof UTCDateTime;

        return [
            'totalClicks' => (int) ($row['total'] ?? 0),
            'humanClicks' => (int) ($row['human'] ?? 0),
            'period' => $hasPeriod ? ['from' => self::iso($row['from']), 'to' => self::iso($row['to'])] : null,
        ];
    }

    /**
     * Campaign links with at least one human click, most clicked first. Zero-click links
     * (unused auto-created platform links) are left out.
     *
     * @param  ClickMatch  $match
     * @return list<array{title: string, platform: string, url: string|null, publishedAt: string|null, humanClicks: int, share: float}>
     */
    public function links(array $match): array
    {
        $counts = [];
        foreach (Collections::clicks()->aggregate([
            ['$match' => [...$match, 'isBot' => false]],
            ['$group' => ['_id' => '$link', 'clicks' => ['$sum' => 1]]],
        ], self::ARRAY_TYPE_MAP) as $row) {
            $counts[(string) $row['_id']] = (int) $row['clicks'];
        }

        $links = Collections::links()->find(
            ['project' => $match['project'], 'campaign' => $match['campaign']],
            ['projection' => ['title' => 1, 'platform' => 1, 'customUrl' => 1, 'createdAt' => 1], ...self::ARRAY_TYPE_MAP],
        )->toArray();

        $total = array_sum(array_intersect_key($counts, array_flip(array_map(fn (array $link) => (string) $link['_id'], $links))));
        $rows = [];
        foreach ($links as $link) {
            $clicks = $counts[(string) $link['_id']] ?? 0;
            if ($clicks === 0) {
                continue;
            }
            $rows[] = [
                'title' => (string) ($link['title'] ?? ''),
                'platform' => (string) ($link['platform'] ?? 'other'),
                'url' => isset($link['customUrl']) ? (string) $link['customUrl'] : null,
                'publishedAt' => ($link['createdAt'] ?? null) instanceof UTCDateTime ? self::iso($link['createdAt']) : null,
                'humanClicks' => $clicks,
                'share' => JsNumber::round1($clicks / $total * 100),
            ];
        }

        usort($rows, fn (array $a, array $b) => [$b['humanClicks'], $a['title']] <=> [$a['humanClicks'], $b['title']]);

        return $rows;
    }

    /**
     * Top countries, device mix and zero-filled human clicks per UTC day for the last `$days`
     * days (today included).
     *
     * @param  ClickMatch  $match
     * @return array{humanClicks: int, days: int, topCountries: list<array{country: string, clicks: int, share: float}>, devices: list<array{type: string, clicks: int, share: float}>, clicksByDay: list<array{date: string, clicks: int}>}
     */
    public function audience(array $match, int $days = 30, int $topCountries = 10): array
    {
        $start = CarbonImmutable::now('UTC')->startOfDay()->subDays($days - 1);
        $facets = Collections::clicks()->aggregate([
            ['$match' => [...$match, 'isBot' => false]],
            ['$facet' => [
                'total' => [['$count' => 'clicks']],
                'countries' => [
                    ['$group' => ['_id' => ['$ifNull' => ['$geo.country', 'unknown']], 'clicks' => ['$sum' => 1]]],
                    ['$sort' => ['clicks' => -1, '_id' => 1]],
                    ['$limit' => $topCountries],
                ],
                'devices' => [
                    ['$group' => ['_id' => ['$ifNull' => ['$device.type', 'unknown']], 'clicks' => ['$sum' => 1]]],
                    ['$sort' => ['clicks' => -1, '_id' => 1]],
                ],
                'days' => [
                    ['$match' => ['clickedAt' => ['$gte' => new UTCDateTime($start->getTimestampMs())]]],
                    ['$group' => ['_id' => ['$dateToString' => ['format' => '%Y-%m-%d', 'date' => '$clickedAt', 'timezone' => 'UTC']], 'clicks' => ['$sum' => 1]]],
                ],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray()[0] ?? [];

        $human = (int) ($facets['total'][0]['clicks'] ?? 0);
        $share = fn (int $clicks): float => $human === 0 ? 0.0 : JsNumber::round1($clicks / $human * 100);

        $byDay = array_column($facets['days'] ?? [], 'clicks', '_id');
        $clicksByDay = [];
        for ($day = 0; $day < $days; $day++) {
            $date = $start->addDays($day)->format('Y-m-d');
            $clicksByDay[] = ['date' => $date, 'clicks' => (int) ($byDay[$date] ?? 0)];
        }

        return [
            'humanClicks' => $human,
            'days' => $days,
            'topCountries' => array_map(fn (array $row) => [
                'country' => (string) $row['_id'], 'clicks' => (int) $row['clicks'], 'share' => $share((int) $row['clicks']),
            ], $facets['countries'] ?? []),
            'devices' => array_map(fn (array $row) => [
                'type' => (string) $row['_id'], 'clicks' => (int) $row['clicks'], 'share' => $share((int) $row['clicks']),
            ], $facets['devices'] ?? []),
            'clicksByDay' => $clicksByDay,
        ];
    }

    protected static function iso(UTCDateTime $date): string
    {
        return $date->toDateTime()->format('Y-m-d\TH:i:s.v\Z');
    }
}
