<?php

namespace App\Services\Analytics;

use Closure;
use DateTimeInterface;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * Port of the old raw-IP retention service (`services/ip-retention.service.js`, task A6).
 *
 * Removes stored raw IPs from old clicks without deleting click history: only `ip` is unset.
 * - The retention period must be configured explicitly; there is no default.
 * - Dry-run is the default; apply mode must be requested.
 * - One cutoff (`now - retentionDays`) is fixed for the whole run.
 * - Batches are bounded and paginate by ascending `_id`, so an interrupted run can resume
 *   from `lastId`, and a plain rerun is safe because cleaned clicks no longer match.
 * - Summaries contain counts only, never IP values.
 */
class IpRetention
{
    public const DEFAULT_BATCH_SIZE = 500;

    public const MAX_BATCH_SIZE = 5000;

    public const MS_PER_DAY = 24 * 60 * 60 * 1000;

    public const DEFAULT_MAX_BATCHES = 100000;

    /**
     * Validate an explicitly configured retention period in days (a positive integer).
     *
     * @throws RetentionConfigException
     */
    public static function parseRetentionDays(mixed $raw): int
    {
        if ($raw === null) {
            throw new RetentionConfigException('A retention period is required: pass --retention-days=<days> or set IP_RETENTION_DAYS.');
        }

        $days = self::positiveInteger($raw);

        if ($days === null) {
            throw new RetentionConfigException(sprintf('Invalid retention period %s: expected a positive integer number of days.', self::describe($raw)));
        }

        return $days;
    }

    /**
     * Validate the per-batch limit, defaulting when absent and capping at MAX_BATCH_SIZE.
     *
     * @throws RetentionConfigException
     */
    public static function parseBatchSize(mixed $raw): int
    {
        if ($raw === null || (is_string($raw) && trim($raw) === '')) {
            return self::DEFAULT_BATCH_SIZE;
        }

        $size = self::positiveInteger($raw);

        if ($size === null) {
            throw new RetentionConfigException(sprintf('Invalid batch size %s: expected a positive integer.', self::describe($raw)));
        }

        return min($size, self::MAX_BATCH_SIZE);
    }

    /**
     * The fixed run cutoff in Unix milliseconds. Clicks strictly older are eligible.
     *
     * @throws RetentionConfigException
     */
    public static function cutoff(mixed $retentionDays, int $nowMs): int
    {
        return $nowMs - self::parseRetentionDays($retentionDays) * self::MS_PER_DAY;
    }

    /**
     * Whether a click-like document is eligible: strictly older than the cutoff and holding a
     * non-empty IP string.
     *
     * @param  array<string, mixed>  $document
     */
    public static function isEligible(array $document, int $cutoffMs): bool
    {
        $clickedAt = $document['clickedAt'] ?? null;
        $clickedAtMs = match (true) {
            $clickedAt instanceof UTCDateTime => (int) (string) $clickedAt,
            $clickedAt instanceof DateTimeInterface => (int) $clickedAt->format('Uv'),
            is_int($clickedAt) => $clickedAt,
            default => null,
        };

        if ($clickedAtMs === null || $clickedAtMs >= $cutoffMs) {
            return false;
        }

        return is_string($document['ip'] ?? null) && $document['ip'] !== '';
    }

    /**
     * Run the retention pass and return a counts-only summary.
     *
     * @param  Closure(array{batchIndex: int, ids: list<ObjectId|string>, lastId: ObjectId|string|null}): void|null  $onBatch
     * @return array{mode: string, retentionDays: int, cutoff: int, batchSize: int, scanned: int, eligible: int, updated: int, batches: int, lastId: ObjectId|string|null, completed: bool}
     *
     * @throws RetentionConfigException
     */
    public function run(
        IpRetentionStore $store,
        mixed $retentionDays,
        ?int $nowMs = null,
        mixed $batchSize = self::DEFAULT_BATCH_SIZE,
        bool $dryRun = true,
        ObjectId|string|null $resumeAfterId = null,
        int $maxBatches = self::DEFAULT_MAX_BATCHES,
        ?int $stopAfterBatches = null,
        ?Closure $onBatch = null,
    ): array {
        $days = self::parseRetentionDays($retentionDays);
        $size = self::parseBatchSize($batchSize);
        $cutoff = self::cutoff($days, $nowMs ?? PerformanceWindow::nowMs());

        if ($maxBatches <= 0) {
            throw new RetentionConfigException('Invalid maxBatches: expected a positive integer.');
        }

        if ($stopAfterBatches !== null && $stopAfterBatches < 0) {
            throw new RetentionConfigException('Invalid stopAfterBatches: expected a non-negative integer.');
        }

        $afterId = $resumeAfterId;
        $lastId = $resumeAfterId;
        $eligible = 0;
        $updated = 0;
        $batches = 0;
        $completed = false;

        for ($batchIndex = 0; $batchIndex < $maxBatches; $batchIndex++) {
            if ($stopAfterBatches !== null && $batches >= $stopAfterBatches) {
                break;
            }

            $ids = $store->findEligibleIds($cutoff, $afterId, $size);

            if ($ids === []) {
                $completed = true;
                break;
            }

            $eligible += count($ids);
            $batches++;
            $lastId = $ids[array_key_last($ids)];

            if (! $dryRun) {
                $updated += $store->unsetIpByIds($ids);
            }

            if ($onBatch !== null) {
                $onBatch(['batchIndex' => $batchIndex, 'ids' => $ids, 'lastId' => $lastId]);
            }

            $afterId = $lastId;
        }

        return [
            'mode' => $dryRun ? 'dry-run' : 'apply',
            'retentionDays' => $days,
            'cutoff' => $cutoff,
            'batchSize' => $size,
            'scanned' => $eligible,
            'eligible' => $eligible,
            'updated' => $dryRun ? 0 : $updated,
            'batches' => $batches,
            'lastId' => $lastId,
            'completed' => $completed,
        ];
    }

    /**
     * A positive integer from an int, an integral float or a numeric string, otherwise null.
     */
    protected static function positiveInteger(mixed $raw): ?int
    {
        if (is_string($raw)) {
            $raw = trim($raw);

            if ($raw === '' || ! is_numeric($raw)) {
                return null;
            }

            $raw = $raw + 0;
        }

        if (is_float($raw) && is_finite($raw) && floor($raw) === $raw && abs($raw) < PHP_INT_MAX) {
            $raw = (int) $raw;
        }

        return is_int($raw) && $raw > 0 ? $raw : null;
    }

    protected static function describe(mixed $raw): string
    {
        return is_scalar($raw) || $raw === null ? (string) json_encode($raw) : get_debug_type($raw);
    }
}
