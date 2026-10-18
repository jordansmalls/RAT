<?php

use App\Services\Analytics\PerformanceWindow;

test('rolling windows have 12 equal buckets', function (string $window, int $hours) {
    $now = 1_789_819_200_000;
    $period = PerformanceWindow::make($window, $now);

    expect($period->end - $period->start)->toBe($hours * 3_600_000)
        ->and($period->start - $period->previousStart)->toBe($hours * 3_600_000)
        ->and($period->bucketMs * 12)->toBe($period->end - $period->start)
        ->and($period->end)->toBe($now);
})->with([['24h', 24], ['7d', 168], ['30d', 720]]);

test('invalid windows are rejected', function (mixed $window) {
    expect(PerformanceWindow::make($window, 0))->toBeNull();
})->with(['bad', '__proto__', 'constructor', '', [[]], null, 24]);
