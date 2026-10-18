<?php

use App\Services\Analytics\JsNumber;

test('toFixed matches JavaScript Number(value.toFixed(digits)) on edge cases', function (float $value, int $digits, float $expected) {
    expect(JsNumber::toFixed($value, $digits))->toBe($expected);
})->with([
    'pre-rounding trap 1.005' => [1.005, 2, 1.0],
    'pre-rounding trap 1.45' => [1.45, 1, 1.4],
    'binary below half 0.285' => [0.285, 2, 0.28],
    'binary below half 2.675' => [2.675, 2, 2.67],
    'exact tie rounds up 0.125' => [0.125, 2, 0.13],
    'exact tie rounds up 12.25' => [12.25, 1, 12.3],
    'nearest is lower 0.125 at one digit' => [0.125, 1, 0.1],
    'one third percent' => [(1 / 3) * 100, 1, 33.3],
    'two thirds percent' => [(4 / 6) * 100, 1, 66.7],
    'whole number' => [87.0, 1, 87.0],
    'two decimals' => [10 / 3, 2, 3.33],
    'half' => [5 / 2, 2, 2.5],
    'negative' => [-1.45, 1, -1.4],
    'tiny' => [0.0001, 2, 0.0],
    'large integer' => [2 ** 60, 1, (float) (2 ** 60)],
]);

test('toFixed never returns negative zero', function () {
    expect(json_encode(JsNumber::toFixed(-0.001, 1)))->toBe('0')
        ->and(json_encode(JsNumber::toFixed(-0.0, 2)))->toBe('0');
});

test('whole-number results encode like JavaScript numbers', function () {
    expect(json_encode(['confidence' => JsNumber::round1((87 / 100) * 100)]))->toBe('{"confidence":87}');
});

test('round helpers use one and two decimals', function () {
    expect(JsNumber::round1((1 / 3) * 100))->toBe(33.3)
        ->and(JsNumber::round2(10 / 3))->toBe(3.33);
});

test('toFixed rejects unsupported digit counts', function () {
    JsNumber::toFixed(1.0, 4);
})->throws(InvalidArgumentException::class);
