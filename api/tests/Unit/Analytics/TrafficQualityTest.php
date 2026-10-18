<?php

use App\Services\Analytics\TrafficQuality;

test('traffic quality grades include each threshold and reject the value immediately below', function (float $share, string $grade) {
    expect(TrafficQuality::grade($share, ['A' => 85, 'B' => 70, 'C' => 50]))->toBe($grade);
})->with([
    [100.0, 'A'], [85.0, 'A'], [84.9, 'B'], [70.0, 'B'],
    [69.9, 'C'], [50.0, 'C'], [49.9, 'D'], [0.0, 'D'],
]);

test('traffic quality grades honor configured thresholds regardless of key order', function () {
    expect(TrafficQuality::grade(90, ['C' => 55, 'A' => 95, 'B' => 80]))->toBe('B');
});
