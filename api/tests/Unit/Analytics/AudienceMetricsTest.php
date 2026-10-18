<?php

use App\Services\Analytics\AudienceMetrics;

test('acceptance fixture math matches the A4 plan', function () {
    $result = AudienceMetrics::summarize(totalClicks: 6, identifiedClicks: 4, uniqueVisitors: 2, repeatVisitors: 1);

    expect($result)->not->toHaveKey('totalClicks')
        ->and($result)->toBe([
            'identifiedClicks' => 4,
            'unidentifiedClicks' => 2,
            'uniqueVisitors' => 2,
            'repeatVisitors' => 1,
            'repeatVisitorPercent' => 50.0,
            'clicksPerVisitor' => 2.0,
            'identityCoveragePercent' => 66.7,
            'identityMethod' => 'first-party-cookie-v1',
        ]);
});

test('adding an identified click raises clicks per visitor without lowering the repeat rate', function () {
    $before = AudienceMetrics::summarize(6, 4, 2, 1);
    $after = AudienceMetrics::summarize(7, 5, 2, 1);

    expect($after['clicksPerVisitor'])->toBe(2.5)
        ->and($after['clicksPerVisitor'])->toBeGreaterThan($before['clicksPerVisitor'])
        ->and($after['repeatVisitorPercent'])->toBeGreaterThanOrEqual($before['repeatVisitorPercent']);
});

test('turning a one-click visitor into a repeat visitor raises the repeat rate', function () {
    $before = AudienceMetrics::summarize(6, 4, 2, 1);
    $after = AudienceMetrics::summarize(7, 5, 2, 2);

    expect($after['repeatVisitorPercent'])->toBe(100.0)
        ->and($after['repeatVisitorPercent'])->toBeGreaterThan($before['repeatVisitorPercent']);
});

test('zero denominators return zeros', function () {
    expect(AudienceMetrics::summarize())->toBe([
        'identifiedClicks' => 0,
        'unidentifiedClicks' => 0,
        'uniqueVisitors' => 0,
        'repeatVisitors' => 0,
        'repeatVisitorPercent' => 0,
        'clicksPerVisitor' => 0,
        'identityCoveragePercent' => 0,
        'identityMethod' => 'first-party-cookie-v1',
    ]);

    $allUnidentified = AudienceMetrics::summarize(3, 0, 0, 0);

    expect($allUnidentified['unidentifiedClicks'])->toBe(3)
        ->and($allUnidentified['repeatVisitorPercent'])->toBe(0)
        ->and($allUnidentified['clicksPerVisitor'])->toBe(0)
        ->and($allUnidentified['identityCoveragePercent'])->toEqual(0)
        ->and(json_encode($allUnidentified['identityCoveragePercent']))->toBe('0');
});

test('identified means a trimmed non-empty string', function (mixed $value, bool $expected) {
    expect(AudienceMetrics::isIdentifiedVisitorId($value))->toBe($expected);
})->with([
    ['abc123', true],
    ['  abc  ', true],
    [null, false],
    ['', false],
    ['   ', false],
    ["\t\n ", false],
    ["\u{00A0}\u{2003}", false],
    [0, false],
    [123, false],
    [[], false],
    [true, false],
    [false, false],
]);

test('platform fraction is a uniqueness ratio and zero when empty', function () {
    expect(AudienceMetrics::platformVisitorFraction(2, 4))->toBe(0.5)
        ->and(AudienceMetrics::platformVisitorFraction(1, 3))->toBe(0.33)
        ->and(AudienceMetrics::platformVisitorFraction(0, 0))->toBe(0)
        ->and(AudienceMetrics::platformVisitorFraction(5, 0))->toBe(0);

    expect(AudienceMetrics::emptyPlatformAudience())->toBe([
        'identifiedClicks' => 0,
        'unidentifiedClicks' => 0,
        'uniqueVisitors' => 0,
        'uniqueVisitorFraction' => 0,
        'identityCoveragePercent' => 0,
        'identityMethod' => 'first-party-cookie-v1',
    ]);
});

test('platform keys keep null distinct from strings', function () {
    expect(AudienceMetrics::platformKey(null))->not->toBe(AudienceMetrics::platformKey(''))
        ->and(AudienceMetrics::platformKey('null'))->not->toBe(AudienceMetrics::platformKey(null))
        ->and(AudienceMetrics::platformKey('youtube'))->toBe(AudienceMetrics::platformKey('youtube'));
});
