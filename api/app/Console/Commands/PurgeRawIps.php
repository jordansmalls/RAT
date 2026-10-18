<?php

namespace App\Console\Commands;

use App\Services\Analytics\Bson;
use App\Services\Analytics\ClickScope;
use App\Services\Analytics\IpRetention;
use App\Services\Analytics\MongoIpRetentionStore;
use App\Services\Analytics\RetentionConfigException;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use MongoDB\BSON\ObjectId;
use Throwable;

/**
 * Port of the old `scripts/purge-raw-ips.js` (task A6).
 *
 * Unsets only the `ip` field on clicks older than an explicitly configured retention period;
 * click documents, visitor IDs, counts, timestamps, device and geo fields are kept.
 * Dry-run is the default and nothing changes without `--apply` (`--dry-run` always wins).
 * The command is never scheduled automatically: an operator picks the retention period and
 * wires any schedule. Output contains counts only, never IPs.
 *
 * Exit codes: 0 done, 1 failure, 2 configuration error, 3 stopped before completion.
 */
#[Signature('rat:purge-raw-ips
    {--retention-days= : Required (or IP_RETENTION_DAYS). Clicks older than now minus this many days are eligible}
    {--apply : Unset IPs. Without it the command only reports eligible counts}
    {--dry-run : Explicit dry-run (the default). Overrides --apply}
    {--batch-size= : Documents per batch (or IP_RETENTION_BATCH_SIZE). Default 500, capped at 5000}
    {--resume-after= : Resume an interrupted run after this click _id}
    {--max-batches= : Safety bound on batches for this run}
    {--json : Print only the JSON summary}')]
#[Description('Remove raw IP addresses from clicks older than the retention period (dry-run by default)')]
class PurgeRawIps extends Command
{
    public const EXIT_CONFIG_ERROR = 2;

    public const EXIT_INCOMPLETE = 3;

    public function handle(IpRetention $retention): int
    {
        try {
            $retentionDays = IpRetention::parseRetentionDays($this->option('retention-days') ?? config('rat.ip_retention.days'));
            $batchSize = IpRetention::parseBatchSize($this->option('batch-size') ?? config('rat.ip_retention.batch_size'));
            $resumeAfter = $this->resumeAfter();
            $maxBatches = $this->maxBatches();
        } catch (RetentionConfigException $exception) {
            $this->components->error('Configuration error: '.$exception->getMessage());

            return self::EXIT_CONFIG_ERROR;
        }

        $isDryRun = $this->option('dry-run') || ! $this->option('apply');
        $isJson = (bool) $this->option('json');

        try {
            $summary = $retention->run(
                store: new MongoIpRetentionStore,
                retentionDays: $retentionDays,
                batchSize: $batchSize,
                dryRun: $isDryRun,
                resumeAfterId: $resumeAfter,
                maxBatches: $maxBatches,
                onBatch: function (array $batch) use ($isDryRun, $isJson): void {
                    if (! $isJson) {
                        $this->line(sprintf(
                            'batch %d: %d click(s) %s; cursor=%s',
                            $batch['batchIndex'] + 1,
                            count($batch['ids']),
                            $isDryRun ? 'eligible' : 'cleaned',
                            (string) $batch['lastId'],
                        ));
                    }
                },
            );
        } catch (Throwable $exception) {
            $this->components->error('Retention run failed: '.$exception->getMessage());

            return self::FAILURE;
        }

        $this->printSummary($summary, $isJson);

        if (! $summary['completed']) {
            $this->components->warn('Run stopped before completion. Resume with --resume-after=<cursor> from the summary above, or rerun (already-cleaned clicks are skipped).');

            return self::EXIT_INCOMPLETE;
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $summary
     */
    protected function printSummary(array $summary, bool $isJson): void
    {
        $printable = [
            ...$summary,
            'cutoff' => Bson::isoDate($summary['cutoff']),
            'lastId' => $summary['lastId'] === null ? null : (string) $summary['lastId'],
        ];

        if ($isJson) {
            $this->line((string) json_encode($printable, JSON_UNESCAPED_SLASHES));

            return;
        }

        $lines = [
            "mode: {$printable['mode']}",
            "retentionDays: {$printable['retentionDays']}",
            "cutoff: {$printable['cutoff']} (clickedAt strictly older is eligible)",
            "scanned: {$printable['scanned']}",
            "eligible: {$printable['eligible']}",
            $printable['mode'] === 'apply'
                ? "updated (ip unset): {$printable['updated']}"
                : "would update: {$printable['eligible']} (dry-run changed nothing)",
            "batches: {$printable['batches']}",
            'completed: '.($printable['completed'] ? 'true' : 'false'),
            'resumeAfter (for next run if incomplete): '.($printable['lastId'] ?? 'none'),
        ];

        foreach ($lines as $line) {
            $this->line($line);
        }
    }

    /**
     * @throws RetentionConfigException
     */
    protected function resumeAfter(): ?ObjectId
    {
        $value = $this->option('resume-after');

        if ($value === null || $value === '') {
            return null;
        }

        if (! ClickScope::isStrictObjectIdString($value)) {
            throw new RetentionConfigException(sprintf('Invalid --resume-after value %s: expected a click _id.', json_encode($value)));
        }

        return new ObjectId($value);
    }

    /**
     * @throws RetentionConfigException
     */
    protected function maxBatches(): int
    {
        $value = $this->option('max-batches');

        if ($value === null) {
            return IpRetention::DEFAULT_MAX_BATCHES;
        }

        if (preg_match('/^\d+$/D', trim((string) $value)) !== 1 || (int) $value <= 0) {
            throw new RetentionConfigException(sprintf('Invalid --max-batches value: %s.', json_encode($value)));
        }

        return (int) $value;
    }
}
