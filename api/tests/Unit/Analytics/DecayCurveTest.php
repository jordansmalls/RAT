<?php

use App\Services\Analytics\DecayCurve;

/*
| Feature B: pure curve arithmetic in DecayCurve::summarize(), no database access.
| The histogram is `[ageInDays => clicks]`; days 0..days-1 are always emitted zero-filled.
*/

test('summarize computes the curve, half-life, p90, peak and shares', function () {
    $payload = DecayCurve::summarize([0 => 3, 1 => 2, 2 => 1, 4 => 1, 8 => 1, 50 => 1], 7, 30);

    expect($payload['humanClicks'])->toBe(9)
        ->and($payload['days'])->toBe(7)
        ->and($payload['curve'])->toHaveCount(7)
        ->and($payload['curve'][0])->toBe(['day' => 0, 'clicks' => 3, 'cumulative' => 3, 'cumulativeShare' => 33.3])
        ->and($payload['curve'][4])->toBe(['day' => 4, 'clicks' => 1, 'cumulative' => 7, 'cumulativeShare' => 77.8])
        ->and($payload['curve'][6]['cumulative'])->toBe(7)
        ->and($payload['halfLifeDays'])->toBe(1)
        ->and($payload['p90Days'])->toBe(50)
        ->and($payload['peakDay'])->toBe(0)
        ->and($payload['shareAfterDay7'])->toBe(22.2)
        ->and($payload['shareAfterDay30'])->toBe(11.1)
        ->and($payload['tailClicks'])->toBe(2)
        ->and($payload['evergreen'])->toBeFalse();
});

test('summarize returns nulls and a zero curve for an empty histogram', function () {
    $payload = DecayCurve::summarize([], 7, 30);

    expect($payload['humanClicks'])->toBe(0)
        ->and($payload['curve'])->toHaveCount(7)
        ->and(array_sum(array_column($payload['curve'], 'clicks')))->toBe(0)
        ->and($payload['curve'][0]['cumulativeShare'])->toBe(0.0)
        ->and($payload['halfLifeDays'])->toBeNull()
        ->and($payload['p90Days'])->toBeNull()
        ->and($payload['peakDay'])->toBeNull()
        ->and($payload['shareAfterDay7'])->toBe(0.0)
        ->and($payload['shareAfterDay30'])->toBe(0.0)
        ->and($payload['tailClicks'])->toBe(0)
        ->and($payload['evergreen'])->toBeFalse();
});

test('summarize marks a scope evergreen at the configured threshold', function () {
    expect(DecayCurve::summarize([0 => 3, 7 => 1], 8, 20)['evergreen'])->toBeTrue()
        ->and(DecayCurve::summarize([0 => 3, 7 => 1], 8, 30)['evergreen'])->toBeFalse();
});

test('summarize rounds cumulative shares to one decimal', function () {
    $curve = DecayCurve::summarize([0 => 1, 1 => 2], 3, 30)['curve'];

    expect($curve[0]['cumulativeShare'])->toBe(33.3)
        ->and($curve[1]['cumulativeShare'])->toBe(100.0)
        ->and($curve[2]['cumulativeShare'])->toBe(100.0);
});

test('summarize breaks peak ties on the earliest day', function () {
    expect(DecayCurve::summarize([2 => 5, 9 => 5], 3, 30)['peakDay'])->toBe(2);
});

test('summarize reaches the p90 threshold beyond the plotted curve', function () {
    $payload = DecayCurve::summarize([0 => 1, 90 => 9], 7, 30);

    expect($payload['halfLifeDays'])->toBe(90)
        ->and($payload['p90Days'])->toBe(90)
        ->and(array_sum(array_column($payload['curve'], 'clicks')))->toBe(1);
});
