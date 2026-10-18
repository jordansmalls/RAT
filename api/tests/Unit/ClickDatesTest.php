<?php

use App\Services\ClickDates;
use Carbon\CarbonImmutable;

it('formats click dates like the old en-US helpers', function () {
    $date = CarbonImmutable::parse('2026-09-19 13:05:00', 'UTC');

    expect(ClickDates::dayOfWeek($date))->toBe('Saturday')
        ->and(ClickDates::timeOfDay($date))->toBe('01:05 PM')
        ->and(ClickDates::dateClicked($date))->toBe('9/19/2026')
        ->and(ClickDates::fullDateClicked($date))->toBe('Saturday, September 19th 2026, at 01:05 PM');
});

it('uses English ordinal suffixes, including for the days the old helper printed as undefined', function (int $day, string $suffix) {
    $date = CarbonImmutable::create(2026, 8, $day, 0, 35, 0, 'UTC');

    expect(ClickDates::fullDateClicked($date))->toContain(" {$day}{$suffix} 2026, at 12:35 AM");
})->with([[1, 'st'], [2, 'nd'], [3, 'rd'], [4, 'th'], [11, 'th'], [12, 'th'], [13, 'th'], [20, 'th'], [21, 'st'], [22, 'nd'], [30, 'th'], [31, 'st']]);
