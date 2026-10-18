<?php

use App\Services\Analytics\IpRetention;
use App\Services\Analytics\IpRetentionStore;
use App\Services\Analytics\MongoIpRetentionStore;
use App\Services\Analytics\RetentionConfigException;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

const RETENTION_NOW = 1_789_819_200_000; // 2026-09-19T12:00:00Z

function retentionDaysAgo(float $days): int
{
    return RETENTION_NOW - (int) round($days * IpRetention::MS_PER_DAY);
}

/**
 * In-memory stand-in for the Mongo store, with zero-padded string IDs.
 */
function memoryRetentionStore(array $seed): IpRetentionStore
{
    return new class($seed) implements IpRetentionStore
    {
        public array $docs = [];

        public array $updates = [];

        public int $findCalls = 0;

        public int $unsetCalls = 0;

        public function __construct(array $seed)
        {
            foreach (array_values($seed) as $index => $doc) {
                $this->docs[] = ['_id' => str_pad((string) ($index + 1), 6, '0', STR_PAD_LEFT), ...$doc];
            }
        }

        public function findEligibleIds(int $cutoffMs, ObjectId|string|null $afterId, int $limit): array
        {
            $this->findCalls++;
            $eligible = array_filter($this->docs, fn (array $doc): bool => ($afterId === null || $doc['_id'] > $afterId)
                && IpRetention::isEligible($doc, $cutoffMs));
            usort($eligible, fn (array $a, array $b): int => strcmp($a['_id'], $b['_id']));

            return array_column(array_slice($eligible, 0, $limit), '_id');
        }

        public function unsetIpByIds(array $ids): int
        {
            $this->unsetCalls++;
            $this->updates[] = $ids;
            $count = 0;

            foreach ($this->docs as &$doc) {
                if (in_array($doc['_id'], $ids, true) && array_key_exists('ip', $doc)) {
                    unset($doc['ip']);
                    $count++;
                }
            }

            return $count;
        }
    };
}

/**
 * @return list<array<string, mixed>>
 */
function retentionScenario(): array
{
    $cutoff = IpRetention::cutoff(30, RETENTION_NOW);

    return [
        ['clickedAt' => retentionDaysAgo(60), 'ip' => '10.0.0.1', 'visitorId' => 'aaa', 'device' => 'mobile'],
        ['clickedAt' => retentionDaysAgo(31), 'ip' => '10.0.0.2', 'visitorId' => 'aaa', 'device' => 'desktop'],
        ['clickedAt' => retentionDaysAgo(10), 'ip' => '10.0.0.3', 'visitorId' => 'bbb', 'device' => 'mobile'],
        ['clickedAt' => $cutoff, 'ip' => '10.0.0.4', 'visitorId' => 'ccc'],
        ['clickedAt' => retentionDaysAgo(90), 'visitorId' => 'ddd'],
        ['clickedAt' => retentionDaysAgo(90), 'ip' => null, 'visitorId' => 'eee'],
        ['clickedAt' => retentionDaysAgo(90), 'ip' => '', 'visitorId' => 'fff'],
    ];
}

test('retention days must be an explicit positive integer', function () {
    expect(IpRetention::parseRetentionDays(30))->toBe(30)
        ->and(IpRetention::parseRetentionDays('90'))->toBe(90)
        ->and(IpRetention::parseRetentionDays('  7 '))->toBe(7);
});

test('malformed retention days are rejected', function (mixed $raw) {
    IpRetention::parseRetentionDays($raw);
})->throws(RetentionConfigException::class)->with([
    '', '   ', 'abc', '30d', '3.5', '0', '-5', 0, -1, 2.5, NAN, INF, null, [[]], true,
]);

test('batch size defaults, validates and caps', function () {
    expect(IpRetention::parseBatchSize(null))->toBe(IpRetention::DEFAULT_BATCH_SIZE)
        ->and(IpRetention::parseBatchSize(''))->toBe(IpRetention::DEFAULT_BATCH_SIZE)
        ->and(IpRetention::parseBatchSize(10))->toBe(10)
        ->and(IpRetention::parseBatchSize((string) (IpRetention::MAX_BATCH_SIZE + 1000)))->toBe(IpRetention::MAX_BATCH_SIZE);

    foreach (['abc', 0, -3, 1.5, '0'] as $bad) {
        expect(fn () => IpRetention::parseBatchSize($bad))->toThrow(RetentionConfigException::class);
    }
});

test('the cutoff is now minus the retention days', function () {
    expect(IpRetention::cutoff(30, RETENTION_NOW))->toBe(RETENTION_NOW - 30 * IpRetention::MS_PER_DAY)
        ->and(fn () => IpRetention::cutoff('bad', RETENTION_NOW))->toThrow(RetentionConfigException::class);
});

test('eligibility keeps the cutoff instant and missing IPs out of scope', function () {
    $cutoff = IpRetention::cutoff(30, RETENTION_NOW);

    expect(IpRetention::isEligible(['clickedAt' => retentionDaysAgo(31), 'ip' => '1.1.1.1'], $cutoff))->toBeTrue()
        ->and(IpRetention::isEligible(['clickedAt' => new UTCDateTime(retentionDaysAgo(31)), 'ip' => '1.1.1.1'], $cutoff))->toBeTrue()
        ->and(IpRetention::isEligible(['clickedAt' => $cutoff, 'ip' => '1.1.1.1'], $cutoff))->toBeFalse()
        ->and(IpRetention::isEligible(['clickedAt' => retentionDaysAgo(10), 'ip' => '1.1.1.1'], $cutoff))->toBeFalse()
        ->and(IpRetention::isEligible(['clickedAt' => retentionDaysAgo(60)], $cutoff))->toBeFalse()
        ->and(IpRetention::isEligible(['clickedAt' => retentionDaysAgo(60), 'ip' => null], $cutoff))->toBeFalse()
        ->and(IpRetention::isEligible(['clickedAt' => retentionDaysAgo(60), 'ip' => ''], $cutoff))->toBeFalse();
});

test('the Mongo filter is a strict $lt on clickedAt and only unsets ip', function () {
    $cutoff = IpRetention::cutoff(30, RETENTION_NOW);
    $filter = MongoIpRetentionStore::filter($cutoff);

    expect(array_keys($filter['clickedAt']))->toBe(['$lt'])
        ->and((int) (string) $filter['clickedAt']['$lt'])->toBe($cutoff)
        ->and($filter['ip'])->toBe(['$exists' => true, '$nin' => [null, '']])
        ->and($filter)->not->toHaveKey('visitorId')
        ->and($filter)->not->toHaveKey('_id')
        ->and(MongoIpRetentionStore::filter($cutoff, '000010')['_id'])->toBe(['$gt' => '000010'])
        ->and(MongoIpRetentionStore::update())->toBe(['$unset' => ['ip' => '']]);
});

test('dry-run changes nothing and reports eligible counts', function () {
    $store = memoryRetentionStore(retentionScenario());
    $before = $store->docs;

    $summary = (new IpRetention)->run($store, retentionDays: 30, nowMs: RETENTION_NOW);

    expect($summary['mode'])->toBe('dry-run')
        ->and($summary['eligible'])->toBe(2)
        ->and($summary['updated'])->toBe(0)
        ->and($summary['completed'])->toBeTrue()
        ->and($store->docs)->toBe($before);
});

test('apply removes only old IPs and keeps every other field', function () {
    $store = memoryRetentionStore(retentionScenario());

    $summary = (new IpRetention)->run($store, retentionDays: 30, nowMs: RETENTION_NOW, dryRun: false);
    $byId = array_column($store->docs, null, '_id');

    expect($summary['mode'])->toBe('apply')
        ->and($summary['updated'])->toBe(2)
        ->and($summary['completed'])->toBeTrue()
        ->and($byId['000001'])->not->toHaveKey('ip')
        ->and($byId['000002'])->not->toHaveKey('ip')
        ->and($byId['000003']['ip'])->toBe('10.0.0.3')
        ->and($byId['000004']['ip'])->toBe('10.0.0.4')
        ->and($byId['000001']['visitorId'])->toBe('aaa')
        ->and($byId['000001']['device'])->toBe('mobile')
        ->and($store->updates)->toBe([['000001', '000002']]);
});

test('batching paginates with a stable cursor', function () {
    $store = memoryRetentionStore(array_map(fn (int $i): array => [
        'clickedAt' => retentionDaysAgo(60), 'ip' => "10.1.0.{$i}", 'visitorId' => "v{$i}",
    ], range(1, 5)));
    $seen = [];

    $summary = (new IpRetention)->run($store, retentionDays: 30, nowMs: RETENTION_NOW, batchSize: 2, dryRun: false,
        onBatch: function (array $batch) use (&$seen): void {
            $seen[] = count($batch['ids']);
        });

    expect($seen)->toBe([2, 2, 1])
        ->and($summary['batches'])->toBe(3)
        ->and($summary['updated'])->toBe(5)
        ->and($summary['completed'])->toBeTrue();
});

test('interrupted runs resume from the cursor and reruns are safe', function () {
    $store = memoryRetentionStore(array_map(fn (int $i): array => [
        'clickedAt' => retentionDaysAgo(60), 'ip' => "10.2.0.{$i}",
    ], range(1, 5)));
    $retention = new IpRetention;

    $interrupted = $retention->run($store, 30, RETENTION_NOW, batchSize: 2, dryRun: false, stopAfterBatches: 1);
    $resumed = $retention->run($store, 30, RETENTION_NOW, batchSize: 2, dryRun: false, resumeAfterId: $interrupted['lastId']);
    $rerun = $retention->run($store, 30, RETENTION_NOW, dryRun: false);

    expect($interrupted['completed'])->toBeFalse()
        ->and($interrupted['updated'])->toBe(2)
        ->and($resumed['completed'])->toBeTrue()
        ->and($resumed['updated'])->toBe(3)
        ->and($rerun['eligible'])->toBe(0)
        ->and($rerun['updated'])->toBe(0);
});

test('malformed settings fail before any storage access', function () {
    $store = memoryRetentionStore([['clickedAt' => retentionDaysAgo(60), 'ip' => '9.9.9.9']]);
    $retention = new IpRetention;

    expect(fn () => $retention->run($store, 'soon', RETENTION_NOW))->toThrow(RetentionConfigException::class)
        ->and(fn () => $retention->run($store, 0, RETENTION_NOW))->toThrow(RetentionConfigException::class)
        ->and(fn () => $retention->run($store, 30, RETENTION_NOW, maxBatches: 0))->toThrow(RetentionConfigException::class)
        ->and($store->findCalls)->toBe(0)
        ->and($store->unsetCalls)->toBe(0);
});

test('summaries never contain raw IP values', function () {
    $summary = (new IpRetention)->run(memoryRetentionStore(retentionScenario()), 30, RETENTION_NOW, dryRun: false);
    $serialized = json_encode($summary);

    foreach (['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4'] as $ip) {
        expect($serialized)->not->toContain($ip);
    }
});
