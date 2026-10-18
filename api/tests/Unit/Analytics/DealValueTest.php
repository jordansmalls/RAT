<?php

use App\Services\Analytics\DealValue;

/*
| Feature D arithmetic, without a database. The config is loaded straight from the file so the
| test does not need the application container.
*/

beforeEach(function () {
    $this->config = (require __DIR__.'/../../../config/sponsor.php')['deal_value'];
});

test('summarize matches the hand-checked USD fixture', function () {
    $result = DealValue::summarize(40, 30, ['amount' => 20.0, 'currency' => 'USD', 'category' => 'saas'], $this->config);

    expect($result)->toEqual([
        'deal' => ['amount' => 20.0, 'currency' => 'USD', 'category' => 'saas'],
        'humanClicks' => 40,
        'uniqueVisitors' => 30,
        'effectiveCpc' => 0.5,
        'costPerUniqueVisitor' => 0.67,
        'benchmarks' => [
            ['channel' => 'meta', 'label' => 'Meta ads', 'cpc' => 2.10, 'equivalentSpend' => 84.0, 'savings' => 64.0, 'multiple' => 4.20],
            ['channel' => 'google_search', 'label' => 'Google Search ads', 'cpc' => 3.60, 'equivalentSpend' => 144.0, 'savings' => 124.0, 'multiple' => 7.20],
            ['channel' => 'tiktok', 'label' => 'TikTok ads', 'cpc' => 0.90, 'equivalentSpend' => 36.0, 'savings' => 16.0, 'multiple' => 1.80],
            ['channel' => 'youtube_ads', 'label' => 'YouTube ads (per view-click proxy)', 'cpc' => 0.70, 'equivalentSpend' => 28.0, 'savings' => 8.0, 'multiple' => 1.40],
            ['channel' => 'linkedin', 'label' => 'LinkedIn ads', 'cpc' => 6.20, 'equivalentSpend' => 248.0, 'savings' => 228.0, 'multiple' => 12.40],
        ],
        'bestComparison' => ['channel' => 'linkedin', 'multiple' => 12.40],
        'benchmarkSource' => 'Typical 2025-2026 CPC ranges by category; directional, not a quote.',
        'currencyNote' => 'Benchmarks are USD; non-USD deals are converted at the configured static rate.',
    ]);
});

test('zero human clicks produce null CPC figures and null multiples', function () {
    $result = DealValue::summarize(0, 0, ['amount' => 50.0, 'currency' => 'USD', 'category' => 'default'], $this->config);

    expect($result['effectiveCpc'])->toBeNull()
        ->and($result['costPerUniqueVisitor'])->toBeNull()
        ->and($result['bestComparison'])->toBeNull()
        ->and(array_column($result['benchmarks'], 'multiple'))->toBe([null, null, null, null, null])
        ->and(array_column($result['benchmarks'], 'equivalentSpend'))->toBe([0.0, 0.0, 0.0, 0.0, 0.0])
        ->and(array_column($result['benchmarks'], 'savings'))->toBe([-50.0, -50.0, -50.0, -50.0, -50.0]);
});

test('a non-USD deal converts the USD benchmarks at the static rate', function () {
    $result = DealValue::summarize(40, 40, ['amount' => 100.0, 'currency' => 'EUR'], $this->config);
    $cpcs = array_column($result['benchmarks'], 'cpc', 'channel');

    expect($result['effectiveCpc'])->toBe(2.5)
        ->and($cpcs)->toEqual(['meta' => 1.59, 'google_search' => 2.49, 'tiktok' => 0.93, 'youtube_ads' => 0.45, 'linkedin' => 5.17])
        ->and($result['bestComparison'])->toEqual(['channel' => 'linkedin', 'multiple' => 2.07]);
});

test('a null or unknown category falls back to the default benchmark set', function () {
    foreach ([null, 'mystery'] as $category) {
        $result = DealValue::summarize(0, 0, ['amount' => 1.0, 'currency' => 'USD', 'category' => $category], $this->config);

        expect(array_column($result['benchmarks'], 'cpc', 'channel'))
            ->toEqual(['meta' => 1.72, 'google_search' => 2.69, 'tiktok' => 1.0, 'youtube_ads' => 0.49, 'linkedin' => 5.58]);
    }
});
