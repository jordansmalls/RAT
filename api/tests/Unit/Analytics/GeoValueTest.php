<?php

use App\Services\Analytics\GeoValue;

/*
| Feature A score math, exercised on the pure summariser so it needs no database or container.
| The config is loaded straight from config/sponsor.php so these expectations track it.
*/

function geoConfig(): array
{
    return (require __DIR__.'/../../../config/sponsor.php')['geo'];
}

test('score is the click-weighted tier weight over known countries', function () {
    $result = GeoValue::summarize(['US' => 4, 'GB' => 2, 'FR' => 6, 'BR' => 4, 'unknown' => 2], geoConfig());

    expect($result['score'])->toBe(58.1)
        ->and($result['tier1Share'])->toBe(37.5)
        ->and($result['humanClicks'])->toBe(16)
        ->and($result['unknownClicks'])->toBe(2)
        ->and($result['weights'])->toBe(['tier1' => 1.0, 'tier2' => 0.45, 'tier3' => 0.15])
        ->and($result['tiers'])->toBe([
            ['tier' => 'tier1', 'weight' => 1.0, 'clicks' => 6, 'share' => 37.5],
            ['tier' => 'tier2', 'weight' => 0.45, 'clicks' => 6, 'share' => 37.5],
            ['tier' => 'tier3', 'weight' => 0.15, 'clicks' => 4, 'share' => 25.0],
            ['tier' => 'unknown', 'weight' => 0, 'clicks' => 2, 'share' => 0],
        ])
        ->and($result['countries'])->toBe([
            ['country' => 'FR', 'tier' => 'tier2', 'weight' => 0.45, 'clicks' => 6, 'share' => 37.5],
            ['country' => 'BR', 'tier' => 'tier3', 'weight' => 0.15, 'clicks' => 4, 'share' => 25.0],
            ['country' => 'US', 'tier' => 'tier1', 'weight' => 1.0, 'clicks' => 4, 'share' => 25.0],
            ['country' => 'GB', 'tier' => 'tier1', 'weight' => 1.0, 'clicks' => 2, 'share' => 12.5],
        ]);
});

test('tier3 is the fallback for countries not listed in a tier', function () {
    $result = GeoValue::summarize(['JP' => 1, 'FR' => 1, 'BR' => 1], geoConfig());

    expect($result['score'])->toBe(53.3)
        ->and($result['tiers'])->toBe([
            ['tier' => 'tier1', 'weight' => 1.0, 'clicks' => 1, 'share' => 33.3],
            ['tier' => 'tier2', 'weight' => 0.45, 'clicks' => 1, 'share' => 33.3],
            ['tier' => 'tier3', 'weight' => 0.15, 'clicks' => 1, 'share' => 33.3],
        ]);
});

test('country codes are normalised and the literal unknown maps to its bucket', function () {
    $result = GeoValue::summarize(['us' => 3, 'gb ' => 1, 'UNKNOWN' => 2], geoConfig());

    expect($result['humanClicks'])->toBe(4)
        ->and($result['unknownClicks'])->toBe(2)
        ->and($result['tiers'][0])->toBe(['tier' => 'tier1', 'weight' => 1.0, 'clicks' => 4, 'share' => 100.0])
        ->and(array_column($result['countries'], 'country'))->toBe(['US', 'GB']);
});

test('an empty map yields a zero score with empty arrays', function () {
    $result = GeoValue::summarize([], geoConfig());

    expect($result['score'])->toBe(0)
        ->and($result['tier1Share'])->toBe(0)
        ->and($result['humanClicks'])->toBe(0)
        ->and($result['unknownClicks'])->toBe(0)
        ->and($result['tiers'])->toBe([])
        ->and($result['countries'])->toBe([])
        ->and($result['weights'])->toBe(['tier1' => 1.0, 'tier2' => 0.45, 'tier3' => 0.15]);
});

test('a scope of only unknown clicks scores zero but counts them', function () {
    $result = GeoValue::summarize(['unknown' => 5], geoConfig());

    expect($result['score'])->toBe(0)
        ->and($result['humanClicks'])->toBe(0)
        ->and($result['unknownClicks'])->toBe(5)
        ->and($result['tiers'])->toBe([['tier' => 'unknown', 'weight' => 0, 'clicks' => 5, 'share' => 0]]);
});
