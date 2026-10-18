<?php

namespace Tests\Feature\Analytics\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;

/**
 * Seeds analytics fixtures with raw inserts in the stored BSON shapes (ObjectId foreign keys,
 * UTCDateTime dates), the way the old Mongoose models wrote them. Every inserted document is
 * tracked and removed by {@see cleanup()}, so tests never wipe collections other suites use.
 */
class AnalyticsFixtures
{
    public const DAY_MS = 24 * 60 * 60 * 1000;

    /** @var array<string, list<ObjectId>> */
    protected array $inserted = [];

    public static function collection(string $name): Collection
    {
        return DB::connection('mongodb')->getCollection($name);
    }

    /**
     * URL for a project metric. Query values are encoded as given, so `['linkId' => '']`
     * sends an explicit empty value and `['linkId' => ['x']]` sends an array.
     *
     * @param  array<string, mixed>  $query
     */
    public static function projectUrl(ObjectId|string $project, string $metric, array $query = []): string
    {
        $url = "/api/v1/analytics/project/{$project}/{$metric}";

        return $query === [] ? $url : $url.'?'.http_build_query($query);
    }

    /**
     * Every project metric endpoint from the old router.
     *
     * @return list<string>
     */
    public static function metrics(): array
    {
        return [
            'human-confidence', 'export', 'clicks-per-platform', 'global-reach', 'efficiency', 'heatmap',
            'loyalty', 'device-breakdown', 'recent-activity', 'platform-dominance', 'network-effect',
            'velocity', 'hero-campaign', 'monthly-health',
        ];
    }

    public static function nowMs(): int
    {
        return now()->getTimestampMs();
    }

    public static function date(int $ms): UTCDateTime
    {
        return new UTCDateTime($ms);
    }

    public static function daysAgo(float $days): UTCDateTime
    {
        return new UTCDateTime(self::nowMs() - (int) round($days * self::DAY_MS));
    }

    public static function hoursAgo(float $hours): UTCDateTime
    {
        return new UTCDateTime(self::nowMs() - (int) round($hours * 60 * 60 * 1000));
    }

    /**
     * An onboarded user, inserted raw and loaded through the app's User model for Sanctum.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function user(array $attributes = []): User
    {
        $suffix = bin2hex(random_bytes(6));
        $id = $this->insert('users', [
            'email' => "analytics-{$suffix}@example.com",
            'passwordHash' => '$2y$04$'.str_repeat('a', 53),
            'handle' => "analytics_{$suffix}",
            'onboardingStep' => 'complete',
            'createdAt' => self::date(self::nowMs()),
            'updatedAt' => self::date(self::nowMs()),
            ...$attributes,
        ]);

        return User::query()->findOrFail((string) $id);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function project(ObjectId|User $owner, array $attributes = []): ObjectId
    {
        return $this->insert('projects', [
            'owner' => $owner instanceof User ? new ObjectId((string) $owner->getAuthIdentifier()) : $owner,
            'clientName' => 'Client',
            'description' => 'Analytics fixture',
            ...$this->timestamps(),
            ...$attributes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function campaign(ObjectId $project, array $attributes = []): ObjectId
    {
        return $this->insert('campaigns', [
            'project' => $project,
            'title' => 'Campaign',
            'url' => 'https://example.com/campaign',
            ...$this->timestamps(),
            ...$attributes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function link(ObjectId $project, ObjectId $campaign, string $platform, array $attributes = []): ObjectId
    {
        $slug = 'an-'.bin2hex(random_bytes(5));

        return $this->insert('links', [
            'project' => $project,
            'campaign' => $campaign,
            'title' => ucfirst($platform),
            'platform' => $platform,
            'slug' => $slug,
            'destinationUrl' => 'https://example.com/campaign',
            'customUrl' => "http://localhost:4000/{$slug}",
            'isActive' => true,
            'clickCount' => 0,
            ...$this->timestamps(),
            ...$attributes,
        ]);
    }

    /**
     * Insert a click. Pass `null` for a key to store an explicit null, or list it in `$unset`
     * to leave the field out entirely (historical documents).
     *
     * @param  array<string, mixed>  $attributes
     * @param  list<string>  $unset
     */
    public function click(ObjectId $project, ObjectId $campaign, ObjectId $link, array $attributes = [], array $unset = []): ObjectId
    {
        $document = [
            'link' => $link,
            'campaign' => $campaign,
            'project' => $project,
            'destinationUrl' => 'https://example.com/x',
            'clickedAt' => self::date(self::nowMs()),
            'dayOfWeek' => 2,
            'hourOfDay' => 10,
            'fullDateClicked' => '2026-09-16',
            'ip' => '1.1.1.1',
            'geo' => ['country' => 'US'],
            'device' => ['type' => 'desktop'],
            'browser' => ['name' => 'Chrome'],
            'os' => ['name' => 'Windows'],
            'referrer' => null,
            'isBot' => false,
            ...$attributes,
        ];

        foreach ($unset as $field) {
            unset($document[$field]);
        }

        return $this->insert('clicks', $document);
    }

    /**
     * @param  array<string, mixed>  $document
     */
    public function insert(string $collection, array $document): ObjectId
    {
        $id = self::collection($collection)->insertOne($document)->getInsertedId();
        $this->inserted[$collection][] = $id;

        return $id;
    }

    /**
     * Remove every document this fixture inserted, plus Sanctum tokens for its users.
     */
    public function cleanup(): void
    {
        foreach ($this->inserted as $collection => $ids) {
            self::collection($collection)->deleteMany(['_id' => ['$in' => $ids]]);
        }

        $this->inserted = [];
    }

    /**
     * @return array{createdAt: UTCDateTime, updatedAt: UTCDateTime}
     */
    protected function timestamps(): array
    {
        return ['createdAt' => self::date(self::nowMs()), 'updatedAt' => self::date(self::nowMs())];
    }
}
