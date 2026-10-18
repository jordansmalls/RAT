<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Geo value score (Feature A): how much a scope's human traffic is worth by country.
 *
 * Human clicks only (`isBot === false`; a missing or null flag is not human, as everywhere
 * else in analytics). Each click's country (`geo.country`, ISO-3166 alpha-2) is normalised
 * to uppercase and mapped to an ad-value tier in `config/sponsor.php` under `geo`:
 *
 * - `tier1`  highest-value ad markets (weight 1.0),
 * - `tier2`  mid-value markets (weight 0.45),
 * - `tier3`  every other known country (weight 0.15),
 * - `unknown` a missing or blank country, or the literal "unknown"; weight 0 and excluded
 *   from the score denominator.
 *
 * The score is the click-weighted average tier weight as a 0-100 index (one decimal):
 *
 *     score = Σ(knownCountryClicks × tierWeight) / Σ(knownCountryClicks) × 100
 *
 * `humanClicks` is the number of human clicks with a known country (the score denominator);
 * human clicks with an unknown country are reported separately as `unknownClicks`. Shares are
 * percentages of `humanClicks`, so the known tiers' shares sum to 100 and `score` equals the
 * weighted sum of those shares. The score is a relative index of ad value, not a currency.
 *
 * @phpstan-type ClickMatch array{project: ObjectId, link?: ObjectId, campaign?: ObjectId}
 */
class GeoValue
{
    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    public const UNKNOWN_COUNTRY = 'unknown';

    /**
     * Run the aggregation and summarise it. Works for any combination of `project`, `link`
     * and `campaign` keys in the match.
     *
     * @param  ClickMatch  $match
     * @return array<string, mixed>
     */
    public function compute(array $match): array
    {
        $rows = Collections::clicks()->aggregate([
            ['$match' => [...$match, 'isBot' => false]],
            ['$group' => ['_id' => '$geo.country', 'clicks' => ['$sum' => 1]]],
        ], self::ARRAY_TYPE_MAP)->toArray();

        $clicksByCountry = [];

        foreach ($rows as $row) {
            $country = self::normalizeCountry($row['_id'] ?? null);
            $clicksByCountry[$country] = ($clicksByCountry[$country] ?? 0) + (int) $row['clicks'];
        }

        return self::summarize($clicksByCountry, config('sponsor.geo'));
    }

    /**
     * Turn a `country => humanClicks` map into the response payload. Pure: the tier config is
     * passed in, so the score math can be unit tested without the Laravel container.
     *
     * @param  array<string, int>  $clicksByCountry
     * @param  array{tiers: array<string, array{weight: int|float, countries: list<string>}>, unknown_country?: string, country_limit?: int}  $geo
     * @return array<string, mixed>
     */
    public static function summarize(array $clicksByCountry, array $geo): array
    {
        $tierDefinitions = $geo['tiers'];
        $unknownKey = $geo['unknown_country'] ?? self::UNKNOWN_COUNTRY;
        $countryLimit = (int) ($geo['country_limit'] ?? 50);
        $defaultTier = array_key_last($tierDefinitions);

        $tierOf = [];
        $weights = [];

        foreach ($tierDefinitions as $tier => $definition) {
            $weights[$tier] = $definition['weight'];

            foreach ($definition['countries'] as $code) {
                $tierOf[$code] = $tier;
            }
        }

        $tierClicks = array_fill_keys(array_keys($tierDefinitions), 0);
        $unknownClicks = 0;
        $buckets = [];

        foreach ($clicksByCountry as $rawCountry => $clicks) {
            $clicks = (int) $clicks;

            if ($clicks <= 0) {
                continue;
            }

            $country = self::normalizeCountry($rawCountry);

            if ($country === $unknownKey || $country === self::UNKNOWN_COUNTRY) {
                $unknownClicks += $clicks;

                continue;
            }

            $tier = $tierOf[$country] ?? $defaultTier;
            $tierClicks[$tier] += $clicks;

            if (isset($buckets[$country])) {
                $buckets[$country]['clicks'] += $clicks;
            } else {
                $buckets[$country] = ['country' => $country, 'tier' => $tier, 'clicks' => $clicks];
            }
        }

        $humanClicks = (int) array_sum($tierClicks);
        $weighted = 0.0;

        foreach ($tierClicks as $tier => $clicks) {
            $weighted += $clicks * $weights[$tier];
        }

        $score = $humanClicks > 0 ? JsNumber::toFixed($weighted / $humanClicks * 100, 1) : 0;
        $tier1Share = $humanClicks > 0 ? JsNumber::toFixed(($tierClicks['tier1'] ?? 0) / $humanClicks * 100, 1) : 0;

        $tiers = [];

        foreach ($tierDefinitions as $tier => $definition) {
            if ($tierClicks[$tier] <= 0) {
                continue;
            }

            $tiers[] = [
                'tier' => $tier,
                'weight' => $definition['weight'],
                'clicks' => $tierClicks[$tier],
                'share' => JsNumber::toFixed($tierClicks[$tier] / $humanClicks * 100, 1),
            ];
        }

        if ($unknownClicks > 0) {
            $tiers[] = [
                'tier' => self::UNKNOWN_COUNTRY,
                'weight' => 0,
                'clicks' => $unknownClicks,
                'share' => 0,
            ];
        }

        $countries = array_map(
            fn (array $row): array => [
                'country' => $row['country'],
                'tier' => $row['tier'],
                'weight' => $weights[$row['tier']],
                'clicks' => $row['clicks'],
                'share' => JsNumber::toFixed($row['clicks'] / $humanClicks * 100, 1),
            ],
            array_values($buckets),
        );

        usort($countries, fn (array $a, array $b): int => $b['clicks'] <=> $a['clicks'] ?: $a['country'] <=> $b['country']);

        return [
            'score' => $score,
            'tier1Share' => $tier1Share,
            'humanClicks' => $humanClicks,
            'unknownClicks' => $unknownClicks,
            'tiers' => $tiers,
            'countries' => array_slice($countries, 0, $countryLimit),
            'weights' => $weights,
        ];
    }

    /**
     * Normalise a raw `geo.country` value to an uppercase ISO-2 code, or the unknown bucket
     * for a missing, blank or literal "unknown" value.
     */
    public static function normalizeCountry(mixed $country): string
    {
        if (! is_string($country)) {
            return self::UNKNOWN_COUNTRY;
        }

        $normalized = strtoupper(trim($country));

        return $normalized === '' || $normalized === 'UNKNOWN' ? self::UNKNOWN_COUNTRY : $normalized;
    }
}
