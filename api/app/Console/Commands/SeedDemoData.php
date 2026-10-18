<?php

namespace App\Console\Commands;

use App\Services\Analytics\Collections;
use Generator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Throwable;

/**
 * Port of the old `scripts/seed-dashboard.js`.
 *
 * Adds fictional demo projects, campaigns, links and clicks to an existing account. Ids are
 * derived from the account id, so the command is additive and repeatable: existing documents,
 * including demo records the user has edited, are never overwritten (`$setOnInsert` upserts).
 * A rerun keeps the original seed window, so retrying a partial run fills in what is missing.
 */
#[Signature('rat:seed-demo
    {--email= : Email of the existing account that should own the demo data}
    {--dry-run : Report what would be inserted without writing}')]
#[Description('Add fictional demo projects, campaigns, links and clicks to an existing account')]
class SeedDemoData extends Command
{
    private const DAY_MS = 86_400_000;

    private const PLATFORMS = ['youtube', 'instagram', 'twitter', 'tiktok', 'linkedin', 'facebook', 'threads', 'reddit', 'twitch', 'pinterest', 'other'];

    private const FIXTURES = [
        ['Horizon Studio (Demo)', ['Autumn collection launch', 'Behind the scenes', 'Creator partnerships', 'Weekend offer']],
        ['Field Notes (Demo)', ['September newsletter', 'The weekly edit', 'Podcast season two', 'Community workshop']],
        ['Northstar Coffee (Demo)', ['New seasonal roast', 'Meet the growers', 'Subscription launch', 'Holiday gift guide']],
        ['Next launch (Demo)', []],
    ];

    private const LOCATIONS = [
        ['country' => 'US', 'region' => 'NY', 'city' => 'New York', 'timezone' => 'America/New_York', 'll' => ['lat' => 40.71, 'lon' => -74]],
        ['country' => 'GB', 'region' => 'ENG', 'city' => 'London', 'timezone' => 'Europe/London', 'll' => ['lat' => 51.51, 'lon' => -0.13]],
        ['country' => 'CA', 'region' => 'ON', 'city' => 'Toronto', 'timezone' => 'America/Toronto', 'll' => ['lat' => 43.65, 'lon' => -79.38]],
        ['country' => 'DE', 'region' => 'BE', 'city' => 'Berlin', 'timezone' => 'Europe/Berlin', 'll' => ['lat' => 52.52, 'lon' => 13.4]],
        ['country' => 'AU', 'region' => 'NSW', 'city' => 'Sydney', 'timezone' => 'Australia/Sydney', 'll' => ['lat' => -33.87, 'lon' => 151.21]],
    ];

    private string $namespace = '';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->option('email')));

        if ($email === '') {
            $this->components->error('Pass --email=<existing account email>.');

            return self::FAILURE;
        }

        try {
            $user = Collections::get('users')->findOne(['email' => $email]);

            if ($user === null) {
                $this->components->error('The seed account does not exist.');

                return self::FAILURE;
            }

            $this->namespace = 'rat-dashboard-demo-v1:'.$user['_id'];
            $first = Collections::projects()->findOne(['_id' => $this->id('project:0')]);

            if ($first !== null && (string) $first['owner'] !== (string) $user['_id']) {
                $this->components->error('Seed ownership mismatch.');

                return self::FAILURE;
            }

            $anchor = $first !== null
                ? (int) $first['createdAt']->toDateTime()->format('Uv') + 60 * self::DAY_MS
                : (int) floor(microtime(true) * 1000);

            $dryRun = (bool) $this->option('dry-run');
            $collections = ['projects', 'campaigns', 'links', 'clicks'];
            $report = [
                'account' => $email,
                'dryRun' => $dryRun,
                'planned' => array_fill_keys($collections, 0),
                'inserted' => $dryRun ? [] : array_fill_keys($collections, 0),
            ];
            $pending = array_fill_keys($collections, []);

            // Documents are written in batches as they are generated, so the clicks never sit in memory at once.
            foreach ($this->documents($user['_id'], $anchor) as [$collection, $document]) {
                $report['planned'][$collection]++;

                if ($dryRun) {
                    continue;
                }

                $pending[$collection][] = $document;

                if (count($pending[$collection]) >= 1000) {
                    $report['inserted'][$collection] += $this->upsert($collection, $pending[$collection]);
                    $pending[$collection] = [];
                }
            }

            foreach ($dryRun ? [] : $pending as $collection => $documents) {
                $report['inserted'][$collection] += $this->upsert($collection, $documents);
            }

            $this->line((string) json_encode($report, JSON_PRETTY_PRINT));
        } catch (Throwable $exception) {
            // Database errors can include connection details, so only the error class is printed.
            $this->components->error(sprintf(
                'Seed failed (%s). No existing data was removed. Fix the connection or validation issue and rerun.',
                class_basename($exception),
            ));

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * Insert documents that don't exist yet and return how many were inserted.
     *
     * @param  list<array<string, mixed>>  $documents
     */
    private function upsert(string $collection, array $documents): int
    {
        if ($documents === []) {
            return 0;
        }

        return Collections::get($collection)->bulkWrite(array_map(fn (array $document) => [
            'updateOne' => [['_id' => $document['_id']], ['$setOnInsert' => $document], ['upsert' => true]],
        ], $documents), ['ordered' => true])->getUpsertedCount();
    }

    /**
     * @return Generator<int, array{string, array<string, mixed>}>
     */
    private function documents(ObjectId $owner, int $anchor): Generator
    {
        $baseUrl = rtrim((string) config('rat.base_url'), '/');
        $date = fn (int|float $ms) => new UTCDateTime((int) round($ms));

        foreach (self::FIXTURES as $p => [$name, $campaignTitles]) {
            $projectId = $this->id("project:$p");
            yield ['projects', [
                '_id' => $projectId,
                'owner' => $owner,
                'clientName' => $name,
                'description' => 'Fictional sample data for trying the dashboard. All destinations use example.com.',
                'createdAt' => $date($anchor - 60 * self::DAY_MS),
                'updatedAt' => $date($anchor),
            ]];

            foreach ($campaignTitles as $c => $title) {
                $campaignId = $this->id("campaign:$p:$c");
                $ageDays = 55 - $c * 10 - $p * 3;
                $createdAt = $date($anchor - $ageDays * self::DAY_MS);
                $url = sprintf('https://example.com/demo/%d/%s', $p + 1, str_replace(' ', '-', strtolower($title)));
                yield ['campaigns', [
                    '_id' => $campaignId,
                    'project' => $projectId,
                    'title' => $title,
                    'url' => $url,
                    'createdAt' => $createdAt,
                    'updatedAt' => $createdAt,
                ]];

                foreach (self::PLATFORMS as $l => $platform) {
                    $linkId = $this->id("link:$p:$c:$l");
                    $slug = 'demo-'.substr((string) $linkId, -12);
                    $isActive = ! ($c === 2 && $l > 8);
                    $count = $c === 3 && $p === 2 ? 0 : max(0, 135 - $l * 11 + $p * 8 - $c * 7);
                    yield ['links', [
                        '_id' => $linkId,
                        'project' => $projectId,
                        'campaign' => $campaignId,
                        'title' => $platform === 'other' ? 'Email newsletter' : $platform,
                        'platform' => $platform,
                        'slug' => $slug,
                        'destinationUrl' => $url,
                        'customUrl' => "$baseUrl/$slug",
                        'isActive' => $isActive,
                        'clickCount' => $count,
                        'createdAt' => $createdAt,
                        'updatedAt' => $createdAt,
                    ]];

                    for ($n = 0; $n < $count; $n++) {
                        $fraction = hexdec(substr($this->hash("$linkId:$n"), 0, 8)) / 0xFFFFFFFF;
                        // Recent activity plus 60 days of history for period comparisons.
                        $age = match (true) {
                            $n % 5 === 0 => $fraction * 0.95,
                            $n % 3 === 0 => 1 + $fraction * 6,
                            default => 7 + $fraction * ($ageDays - 7),
                        };
                        $clickedAt = $date($anchor - ($isActive ? $age : max(3, $age)) * self::DAY_MS);
                        $utc = $clickedAt->toDateTime();
                        $mobile = $n % 5 < 3;
                        $tablet = $n % 5 === 4;
                        $apple = $mobile || $tablet;
                        yield ['clicks', [
                            '_id' => $this->id("click:$p:$c:$l:$n"),
                            'link' => $linkId,
                            'campaign' => $campaignId,
                            'project' => $projectId,
                            'destinationUrl' => $url,
                            'clickedAt' => $clickedAt,
                            'fullDateClicked' => $utc->format('Y-m-d'),
                            'dayOfWeek' => (int) $utc->format('w'),
                            'hourOfDay' => (int) $utc->format('G'),
                            'geo' => self::LOCATIONS[($n + $l + $p) % count(self::LOCATIONS)],
                            'device' => [
                                'type' => $mobile ? 'mobile' : ($tablet ? 'tablet' : 'desktop'),
                                'vendor' => $apple ? 'Apple' : 'Generic',
                                'model' => $mobile ? 'iPhone' : ($tablet ? 'iPad' : 'Desktop'),
                            ],
                            'os' => ['name' => $apple ? 'iOS' : 'Windows', 'version' => $apple ? '18' : '11'],
                            'browser' => ['name' => $apple ? 'Safari' : 'Chrome', 'major' => $apple ? '18' : '130'],
                            'referrer' => $platform === 'other' ? '' : sprintf('https://%s.com/', $platform === 'twitter' ? 'x' : $platform),
                            'isBot' => $n % 29 === 0,
                            'visitorId' => $this->hash("{$this->namespace}:visitor:$p:".($n % 70)),
                            'visitorVersion' => 1,
                            'createdAt' => $clickedAt,
                            'updatedAt' => $clickedAt,
                        ]];
                    }
                }
            }
        }

    }

    private function hash(string $key): string
    {
        return hash('sha256', $key);
    }

    private function id(string $key): ObjectId
    {
        return new ObjectId(substr($this->hash("{$this->namespace}:$key"), 0, 24));
    }
}
