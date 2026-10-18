<?php

use Illuminate\Support\Carbon;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Port of the old A6 raw-IP retention integration suite and CLI rules, against the local test
| database. Only `ip` is ever unset; click documents are never deleted.
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-19T12:00:00Z'));
    $this->fixtures = new AnalyticsFixtures;
    $this->cutoffMs = AnalyticsFixtures::nowMs() - 30 * AnalyticsFixtures::DAY_MS;

    $this->clickAt = fn (int $clickedAtMs, array $extra = [], array $unset = []): ObjectId => $this->fixtures->click(
        new ObjectId, new ObjectId, new ObjectId, ['clickedAt' => AnalyticsFixtures::date($clickedAtMs), ...$extra], $unset,
    );
});

afterEach(function () {
    $this->fixtures->cleanup();
});

function storedClick(ObjectId $id): array
{
    return AnalyticsFixtures::collection('clicks')->findOne(['_id' => $id], ['typeMap' => ['root' => 'array', 'document' => 'array']]);
}

test('apply unsets only IPs strictly older than the cutoff and keeps the history', function () {
    $day = AnalyticsFixtures::DAY_MS;
    $oldA = ($this->clickAt)($this->cutoffMs - $day, ['ip' => '10.9.0.1', 'device' => ['type' => 'mobile'], 'visitorId' => 'kept-visitor']);
    $oldB = ($this->clickAt)($this->cutoffMs - 60 * $day, ['ip' => '10.9.0.2']);
    $recent = ($this->clickAt)($this->cutoffMs + $day, ['ip' => '10.9.0.3']);
    $boundary = ($this->clickAt)($this->cutoffMs, ['ip' => '10.9.0.4']);
    $noIp = ($this->clickAt)($this->cutoffMs - $day, unset: ['ip']);
    $emptyIp = ($this->clickAt)($this->cutoffMs - $day, ['ip' => '']);
    $before = AnalyticsFixtures::collection('clicks')->countDocuments();

    $this->artisan('rat:purge-raw-ips', ['--retention-days' => 30, '--apply' => true, '--batch-size' => 1])
        ->expectsOutputToContain('updated (ip unset): 2')
        ->expectsOutputToContain('batches: 2')
        ->doesntExpectOutputToContain('10.9.0.')
        ->assertExitCode(0);

    expect(storedClick($oldA))->not->toHaveKey('ip')
        ->and(storedClick($oldA))->toMatchArray(['device' => ['type' => 'mobile'], 'visitorId' => 'kept-visitor'])
        ->and(storedClick($oldB))->not->toHaveKey('ip')
        ->and(storedClick($recent)['ip'])->toBe('10.9.0.3')
        ->and(storedClick($boundary)['ip'])->toBe('10.9.0.4')
        ->and(storedClick($noIp))->not->toHaveKey('ip')
        ->and(storedClick($emptyIp)['ip'])->toBe('')
        ->and(AnalyticsFixtures::collection('clicks')->countDocuments())->toBe($before);

    $this->artisan('rat:purge-raw-ips', ['--retention-days' => 30, '--apply' => true, '--json' => true])
        ->expectsOutputToContain('"eligible":0')
        ->assertExitCode(0);
});

test('dry-run is the default and changes nothing', function () {
    $old = ($this->clickAt)($this->cutoffMs - AnalyticsFixtures::DAY_MS, ['ip' => '10.8.0.1']);

    $this->artisan('rat:purge-raw-ips', ['--retention-days' => '30'])
        ->expectsOutputToContain('mode: dry-run')
        ->expectsOutputToContain('would update: 1 (dry-run changed nothing)')
        ->assertExitCode(0);

    $this->artisan('rat:purge-raw-ips', ['--retention-days' => '30', '--apply' => true, '--dry-run' => true])
        ->expectsOutputToContain('mode: dry-run')
        ->assertExitCode(0);

    expect(storedClick($old)['ip'])->toBe('10.8.0.1');
});

test('an interrupted run exits 3 and resumes from its cursor', function () {
    foreach (range(1, 3) as $i) {
        ($this->clickAt)($this->cutoffMs - $i * AnalyticsFixtures::DAY_MS, ['ip' => "10.7.0.{$i}"]);
    }

    $this->artisan('rat:purge-raw-ips', ['--retention-days' => 30, '--apply' => true, '--batch-size' => 2, '--max-batches' => 1])
        ->expectsOutputToContain('updated (ip unset): 2')
        ->expectsOutputToContain('completed: false')
        ->assertExitCode(3);

    expect(AnalyticsFixtures::collection('clicks')->countDocuments(['ip' => ['$exists' => true]]))->toBe(1);

    $this->artisan('rat:purge-raw-ips', ['--retention-days' => 30, '--apply' => true])->assertExitCode(0);

    expect(AnalyticsFixtures::collection('clicks')->countDocuments(['ip' => ['$exists' => true]]))->toBe(0);
});

test('missing or malformed settings exit 2 before touching clicks', function (array $options) {
    $old = ($this->clickAt)($this->cutoffMs - AnalyticsFixtures::DAY_MS, ['ip' => '10.6.0.1']);

    $this->artisan('rat:purge-raw-ips', [...$options, '--apply' => true])
        ->expectsOutputToContain('Configuration error')
        ->assertExitCode(2);

    expect(storedClick($old)['ip'])->toBe('10.6.0.1');
})->with([
    'no retention period' => [[]],
    'zero days' => [['--retention-days' => '0']],
    'suffix' => [['--retention-days' => '30d']],
    'fractional' => [['--retention-days' => '3.5']],
    'bad batch size' => [['--retention-days' => '30', '--batch-size' => 'abc']],
    'bad max batches' => [['--retention-days' => '30', '--max-batches' => '0']],
    'bad cursor' => [['--retention-days' => '30', '--resume-after' => 'not-an-id']],
]);
