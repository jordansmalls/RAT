<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Feature D: deal value / effective CPC vs paid ads.
 *
 * Given a campaign deal (`amount`, `currency`, optional `category`, optional `paidAt`) and the
 * human clicks in a campaign scope, {@see compute()} compares what the sponsor actually paid per
 * human click against typical paid-ad CPC benchmarks.
 *
 * Definitions and assumptions:
 * - Human click = `isBot === false` (missing/null `isBot` is not human, same as elsewhere).
 * - Unique visitors = distinct non-empty `visitorId` among those human clicks, counted inside
 *   MongoDB (`$group` by `visitorId` + `$count`); `visitorId` is never projected back to PHP.
 * - `effectiveCpc` = amount / humanClicks, two decimals, in the deal currency (null at 0 clicks).
 * - `costPerUniqueVisitor` = amount / uniqueVisitors, two decimals, null when there are none.
 * - Benchmarks live in config as USD CPCs per category/channel. Each is converted to the deal
 *   currency with the static `fx_to_usd` rate, so every figure below is in the deal currency.
 * - `equivalentSpend` = humanClicks x benchmark CPC. `savings` = equivalentSpend - amount.
 *   `multiple` = benchmark CPC / effectiveCpc (0 when rounding makes effectiveCpc 0 -> null).
 * - `bestComparison` is the channel with the highest `multiple` (first channel on a tie), or null
 *   when there are no human clicks.
 */
class DealValue
{
    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    /**
     * @param  array{project: ObjectId, link?: ObjectId, campaign?: ObjectId}  $match
     * @param  array{amount: int|float, currency: string, category?: string|null}  $deal
     * @return array<string, mixed>
     */
    public function compute(array $match, array $deal): array
    {
        $result = Collections::clicks()->aggregate([
            ['$match' => [...$match, 'isBot' => false]],
            ['$facet' => [
                'clicks' => [['$count' => 'total']],
                'visitors' => [
                    ['$match' => ['visitorId' => ['$type' => 'string']]],
                    ['$match' => ['$expr' => ['$gt' => [['$strLenCP' => ['$trim' => ['input' => '$visitorId']]], 0]]]],
                    ['$group' => ['_id' => '$visitorId']],
                    ['$count' => 'total'],
                ],
            ]],
            ['$project' => [
                '_id' => 0,
                'humanClicks' => ['$ifNull' => [['$arrayElemAt' => ['$clicks.total', 0]], 0]],
                'uniqueVisitors' => ['$ifNull' => [['$arrayElemAt' => ['$visitors.total', 0]], 0]],
            ]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        return self::summarize(
            (int) ($result[0]['humanClicks'] ?? 0),
            (int) ($result[0]['uniqueVisitors'] ?? 0),
            $deal,
        );
    }

    /**
     * Build the deal-value payload from additive counts. Kept free of database access so the
     * arithmetic (rounding, conversion, best comparison) can be unit tested directly.
     *
     * @param  array{amount: int|float, currency: string, category?: string|null}  $deal
     * @param  array<string, mixed>|null  $config  `sponsor.deal_value`; resolved from config when null.
     * @return array<string, mixed>
     */
    public static function summarize(int $humanClicks, int $uniqueVisitors, array $deal, ?array $config = null): array
    {
        $config ??= config('sponsor.deal_value');
        $amount = (float) $deal['amount'];
        $currency = strtoupper((string) ($deal['currency'] ?? 'USD'));
        $category = is_string($deal['category'] ?? null) && $deal['category'] !== '' ? $deal['category'] : 'default';

        $rate = (float) ($config['fx_to_usd'][$currency] ?? 1.0);
        $benchmarks = $config['benchmarks'][$category] ?? $config['benchmarks']['default'];

        $effectiveCpc = $humanClicks > 0 ? JsNumber::toFixed($amount / $humanClicks, 2) : null;
        $costPerUniqueVisitor = $uniqueVisitors > 0 ? JsNumber::toFixed($amount / $uniqueVisitors, 2) : null;

        $rows = [];
        $best = null;

        foreach ($config['channels'] as $channel => $label) {
            $cpc = JsNumber::toFixed((float) ($benchmarks[$channel] ?? 0.0) / $rate, 2);
            $equivalentSpend = JsNumber::toFixed($humanClicks * $cpc, 2);
            $multiple = $effectiveCpc !== null && $effectiveCpc > 0 ? JsNumber::toFixed($cpc / $effectiveCpc, 2) : null;

            $rows[] = [
                'channel' => $channel,
                'label' => $label,
                'cpc' => $cpc,
                'equivalentSpend' => $equivalentSpend,
                'savings' => JsNumber::toFixed($equivalentSpend - $amount, 2),
                'multiple' => $multiple,
            ];

            if ($multiple !== null && ($best === null || $multiple > $best['multiple'])) {
                $best = ['channel' => $channel, 'multiple' => $multiple];
            }
        }

        return [
            'deal' => [
                'amount' => $amount,
                'currency' => $currency,
                'category' => $deal['category'] ?? null,
            ],
            'humanClicks' => $humanClicks,
            'uniqueVisitors' => $uniqueVisitors,
            'effectiveCpc' => $effectiveCpc,
            'costPerUniqueVisitor' => $costPerUniqueVisitor,
            'benchmarks' => $rows,
            'bestComparison' => $best,
            'benchmarkSource' => $config['benchmark_source'],
            'currencyNote' => $config['currency_note'],
        ];
    }
}
