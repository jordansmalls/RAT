<?php

namespace Tests\Feature\SponsorReports\Support;

use App\Models\Campaign;
use App\Models\Link;
use App\Models\Project;
use App\Models\SponsorReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;

/**
 * A creator with socials, one campaign with three links and a spread of clicks. Private values
 * (email, ip, visitorId) use distinctive strings so tests can assert they never leak.
 */
class SponsorReportFixtures
{
    public const EMAIL = 'leaky-creator-email@example.com';

    public const IP = '203.0.113.77';

    public const VISITOR_ID = 'vid-should-never-leak-0042';

    public const DEAL = ['amount' => 500.0, 'currency' => 'USD', 'category' => 'saas', 'paidAt' => null];

    public User $user;

    public Project $project;

    public Campaign $campaign;

    /** @var array<string, Link> */
    public array $links = [];

    public static function collection(string $name): Collection
    {
        return DB::connection('mongodb')->getCollection($name);
    }

    /**
     * Seed the creator, campaign, links and clicks.
     */
    public static function seed(bool $withDeal = false): self
    {
        $fixture = new self;
        $fixture->user = User::factory()->create(['name' => 'Ada Creator', 'username' => 'adacreates', 'email' => self::EMAIL]);
        self::collection('users')->updateOne(['_id' => new ObjectId($fixture->user->id)], ['$set' => ['socials' => [
            'youtube' => ['identifier' => '@adacreates', 'displayName' => 'Ada Creates', 'count' => 120000, 'approximate' => true, 'syncedAt' => new UTCDateTime, 'lastError' => null],
            'instagram' => ['identifier' => 'ada.creates', 'displayName' => 'Ada', 'count' => 30500, 'approximate' => false, 'syncedAt' => new UTCDateTime, 'lastError' => 'rate limited'],
        ]]]);
        $fixture->user->refresh();

        $fixture->project = Project::factory()->create(['owner' => $fixture->user->id, 'clientName' => 'Secret client name']);
        $fixture->campaign = Campaign::factory()->create(['project' => $fixture->project->id, 'title' => 'Spring launch', 'url' => 'https://sponsor.example/landing']);
        if ($withDeal) {
            $fixture->setDeal(self::DEAL);
        }

        $publishedAt = now()->subDays(20);
        foreach (['youtube' => 'YouTube video', 'instagram' => 'Instagram story', 'pinterest' => 'Unused pin'] as $platform => $title) {
            $fixture->links[$platform] = Link::factory()->create([
                'campaign' => $fixture->campaign->id, 'platform' => $platform, 'title' => $title, 'createdAt' => $publishedAt,
            ]);
        }

        $clicks = [];
        for ($i = 0; $i < 6; $i++) {
            $clicks[] = $fixture->clickDocument('youtube', ['clickedAt' => self::daysAgo(19), 'visitorId' => self::VISITOR_ID.$i, 'geo' => ['country' => 'US'], 'device' => ['type' => 'desktop']]);
        }
        for ($i = 0; $i < 3; $i++) {
            $clicks[] = $fixture->clickDocument('youtube', ['clickedAt' => self::daysAgo(2), 'visitorId' => 'later-'.$i, 'geo' => ['country' => 'FR'], 'device' => ['type' => 'mobile']]);
        }
        $clicks[] = $fixture->clickDocument('instagram', ['clickedAt' => self::daysAgo(1), 'visitorId' => 'insta-1', 'geo' => ['country' => 'BR'], 'device' => ['type' => 'mobile']]);
        $clicks[] = $fixture->clickDocument('youtube', ['isBot' => true, 'clickedAt' => self::daysAgo(1), 'geo' => ['country' => 'CN']]);
        $clicks[] = $fixture->clickDocument('pinterest', ['isBot' => true, 'clickedAt' => self::daysAgo(1)]);
        self::collection('clicks')->insertMany($clicks);

        return $fixture;
    }

    /**
     * @param  array<string, mixed>|null  $deal
     */
    public function setDeal(?array $deal): void
    {
        $update = $deal === null ? ['$unset' => ['deal' => '']] : ['$set' => ['deal' => $deal]];
        self::collection('campaigns')->updateOne(['_id' => new ObjectId($this->campaign->id)], $update);
        $this->campaign->refresh();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function report(string $token, array $attributes = []): SponsorReport
    {
        return SponsorReport::factory()->withToken($token)->create(['campaign' => $this->campaign->id, ...$attributes]);
    }

    public static function daysAgo(float $days): UTCDateTime
    {
        return new UTCDateTime(now()->getTimestampMs() - (int) round($days * 86_400_000));
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    protected function clickDocument(string $platform, array $attributes): array
    {
        return [
            'link' => new ObjectId($this->links[$platform]->id),
            'campaign' => new ObjectId($this->campaign->id),
            'project' => new ObjectId($this->project->id),
            'destinationUrl' => $this->campaign->url,
            'clickedAt' => new UTCDateTime,
            'ip' => self::IP,
            'visitorId' => self::VISITOR_ID,
            'visitorVersion' => 1,
            'geo' => ['country' => 'US'],
            'device' => ['type' => 'desktop'],
            'browser' => ['name' => 'Chrome'],
            'os' => ['name' => 'Windows'],
            'isBot' => false,
            ...$attributes,
        ];
    }
}
