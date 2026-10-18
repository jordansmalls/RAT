<?php

use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Port of the old A1 integration suite (project/link isolation through BSON ObjectIds, invalid
| IDs, empty scopes, deleted links, monthly-health parity) plus exact response bodies.
*/

beforeEach(function () {
    $this->freezeSecond();

    $fixtures = $this->fixtures = new AnalyticsFixtures;
    $this->owner = $fixtures->user();

    $projectA = $fixtures->project($this->owner, ['clientName' => 'A']);
    $projectB = $fixtures->project($this->owner, ['clientName' => 'B']);
    $projectEmpty = $fixtures->project($this->owner, ['clientName' => 'Empty']);
    $campaignA1 = $fixtures->campaign($projectA, ['title' => 'A1']);
    $campaignA2 = $fixtures->campaign($projectA, ['title' => 'A2']);
    $campaignB1 = $fixtures->campaign($projectB, ['title' => 'B1']);
    $linkAYoutube = $fixtures->link($projectA, $campaignA1, 'youtube');
    $linkATiktok = $fixtures->link($projectA, $campaignA2, 'tiktok');
    $linkB = $fixtures->link($projectB, $campaignB1, 'youtube');

    $recent = AnalyticsFixtures::daysAgo(5);
    $previous = AnalyticsFixtures::daysAgo(40);

    foreach ([
        [$campaignA1, $linkAYoutube, '10.0.0.1', 'US', 'desktop', $recent, false],
        [$campaignA1, $linkAYoutube, '10.0.0.2', 'US', 'mobile', $recent, false],
        [$campaignA1, $linkAYoutube, '10.0.0.1', 'CA', 'desktop', $previous, true],
        [$campaignA1, $linkAYoutube, '10.0.0.3', 'US', 'tablet', $recent, false],
        [$campaignA2, $linkATiktok, '10.0.0.4', 'GB', 'mobile', $recent, false],
        [$campaignA2, $linkATiktok, '10.0.0.5', 'GB', 'desktop', $previous, false],
    ] as [$campaign, $link, $ip, $country, $device, $clickedAt, $isBot]) {
        $fixtures->click($projectA, $campaign, $link, [
            'ip' => $ip, 'geo' => ['country' => $country], 'device' => ['type' => $device],
            'clickedAt' => $clickedAt, 'isBot' => $isBot,
        ]);
    }

    foreach (range(1, 5) as $i) {
        $fixtures->click($projectB, $campaignB1, $linkB, [
            'ip' => "192.168.0.{$i}", 'geo' => ['country' => 'DE'], 'clickedAt' => $recent,
        ]);
    }

    $this->ids = (object) compact('projectA', 'projectB', 'projectEmpty', 'campaignA1', 'campaignA2', 'linkAYoutube', 'linkATiktok', 'linkB');

    Sanctum::actingAs($this->owner);
});

afterEach(function () {
    $this->fixtures->cleanup();
});

test('every endpoint isolates clicks by project', function () {
    $projectA = $this->ids->projectA;
    $sumCounts = fn (array $rows): int => array_sum(array_column($rows, 'count'));

    expect($sumCounts($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'clicks-per-platform'))->assertOk()->json('data.data')))->toBe(6)
        ->and($sumCounts($this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectB, 'clicks-per-platform'))->json('data.data')))->toBe(5)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'efficiency'))->assertOk()->json('data.data'))->toHaveCount(2)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'heatmap'))->assertOk()->json('data.heatmap'))->not->toBeEmpty()
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'platform-dominance'))->assertOk()->json('data.data'))->toHaveCount(2)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'network-effect'))->json('data.totalClicks'))->toBe(6)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'loyalty'))->json('data.totalClicks'))->toBe(6)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'global-reach'))->assertOk()->json('data.data'))->toHaveCount(3)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'device-breakdown'))->json('data.total'))->toBe(6)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'recent-activity'))->json('data.data'))->toHaveCount(6);

    $hero = $this->getJson(AnalyticsFixtures::projectUrl($projectA, 'hero-campaign'))->assertOk();
    expect($hero->json('data.clickCount'))->toBe(4)
        ->and($hero->json('data.campaignId'))->toBe((string) $this->ids->campaignA1);

    $export = $this->get(AnalyticsFixtures::projectUrl($projectA, 'export', ['format' => 'json']))->assertOk();
    expect(json_decode($export->streamedContent(), true))->toHaveCount(6);
});

test('endpoints return the old Express bodies wrapped in data', function () {
    $projectA = $this->ids->projectA;
    $get = fn (string $metric): array => $this->getJson(AnalyticsFixtures::projectUrl($projectA, $metric))->assertOk()->json();
    $unidentified = [
        'identifiedClicks' => 0, 'unidentifiedClicks' => 6, 'uniqueVisitors' => 0, 'repeatVisitors' => 0,
        'repeatVisitorPercent' => 0, 'clicksPerVisitor' => 0, 'identityCoveragePercent' => 0,
        'identityMethod' => 'first-party-cookie-v1',
    ];
    $emptyPlatformAudience = fn (int $clicks): array => [
        'identifiedClicks' => 0, 'unidentifiedClicks' => $clicks, 'uniqueVisitors' => 0,
        'uniqueVisitorFraction' => 0, 'identityCoveragePercent' => 0, 'identityMethod' => 'first-party-cookie-v1',
    ];
    $byPlatform = fn (array $rows): array => collect($rows)->sortBy('platform')->values()->all();

    expect($get('human-confidence'))->toBe(['data' => ['message' => 'Human confidence calculated', 'confidence' => 83.3]]);

    expect($get('loyalty'))->toBe(['data' => [
        'message' => 'Loyalty metrics retrieved', 'uniqueIPs' => 5, 'totalClicks' => 6, 'ratio' => 0.83, ...$unidentified,
    ]]);

    expect($get('network-effect'))->toBe(['data' => [
        'message' => 'Network effect retrieved', 'totalClicks' => 6, 'uniqueVisitors' => 5, 'ratio' => 1.2, 'audience' => $unidentified,
    ]]);

    expect($get('device-breakdown'))->toBe(['data' => [
        'message' => 'Device breakdown retrieved', 'mobile' => 2, 'tablet' => 1, 'desktop' => 3, 'total' => 6,
    ]]);

    expect($get('velocity'))->toBe(['data' => ['message' => 'Velocity retrieved', 'growth' => 100]]);

    expect($get('hero-campaign'))->toBe(['data' => [
        'message' => 'Hero campaign retrieved', 'campaignId' => (string) $this->ids->campaignA1, 'title' => 'A1', 'clickCount' => 4,
    ]]);

    $platforms = $get('clicks-per-platform');
    expect($platforms['data']['message'])->toBe('Clicks per platform retrieved')
        ->and($byPlatform($platforms['data']['data']))->toEqual([
            ['platform' => 'tiktok', 'count' => 2],
            ['platform' => 'youtube', 'count' => 4],
        ]);

    expect($get('global-reach'))->toEqual(['data' => ['message' => 'Global reach retrieved', 'data' => [
        ['country' => 'US', 'count' => 3],
        ['country' => 'GB', 'count' => 2],
        ['country' => 'CA', 'count' => 1],
    ]]]);

    $efficiency = $get('efficiency');
    expect($efficiency['data']['message'])->toBe('Platform efficiency retrieved')
        ->and($byPlatform($efficiency['data']['data']))->toBe([
            ['platform' => 'tiktok', 'intent' => 1, 'audience' => $emptyPlatformAudience(2)],
            ['platform' => 'youtube', 'intent' => 0.75, 'audience' => $emptyPlatformAudience(4)],
        ]);

    $dominance = $get('platform-dominance');
    expect($dominance['data']['message'])->toBe('Platform dominance retrieved')
        ->and($byPlatform($dominance['data']['data']))->toBe([
            ['platform' => 'tiktok', 'share' => 33.3],
            ['platform' => 'youtube', 'share' => 66.7],
        ]);

    expect($get('heatmap'))->toEqual(['data' => ['message' => 'Heatmap retrieved', 'heatmap' => [
        ['day' => 2, 'hour' => 10, 'clicks' => 6],
    ]]]);
});

test('recent activity lists the newest ten clicks without private fields', function () {
    $newest = $this->fixtures->click($this->ids->projectA, $this->ids->campaignA1, $this->ids->linkAYoutube, [
        'clickedAt' => AnalyticsFixtures::hoursAgo(1),
        'geo' => ['country' => 'FR', 'city' => 'Paris'],
        'os' => ['name' => 'iOS', 'version' => '18'],
        'visitorId' => 'recent-visitor-secret',
        'visitorVersion' => 1,
    ]);
    foreach (range(1, 6) as $i) {
        $this->fixtures->click($this->ids->projectA, $this->ids->campaignA2, $this->ids->linkATiktok, ['clickedAt' => AnalyticsFixtures::daysAgo(20 + $i)]);
    }

    $response = $this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, 'recent-activity'))->assertOk();
    $rows = $response->json('data.data');

    expect($response->json('data.message'))->toBe('Recent activity retrieved')
        ->and($rows)->toHaveCount(10)
        ->and($rows[0])->toEqual([
            'clickedAt' => now()->subHour()->utc()->format('Y-m-d\TH:i:s.v\Z'),
            'geo' => ['country' => 'FR', 'city' => 'Paris'],
            'device' => ['type' => 'desktop'],
            'browser' => ['name' => 'Chrome'],
            'os' => ['name' => 'iOS', 'version' => '18'],
            'platform' => 'youtube',
        ])
        ->and(array_column($rows, 'clickedAt'))->toBe(collect($rows)->pluck('clickedAt')->sortDesc()->values()->all())
        ->and($response->getContent())->not->toContain('recent-visitor-secret')
        ->not->toContain('visitorId')
        ->not->toContain('"ip"')
        ->not->toContain('"_id"')
        ->not->toContain((string) $newest);
});

test('a valid link ID scopes results and a link from another project matches nothing', function () {
    $projectA = $this->ids->projectA;

    $onlyYoutube = $this->getJson(AnalyticsFixtures::projectUrl($projectA, 'clicks-per-platform', ['linkId' => (string) $this->ids->linkAYoutube]))->assertOk();
    expect($onlyYoutube->json('data.data'))->toBe([['count' => 4, 'platform' => 'youtube']]);

    $onlyTiktok = $this->getJson(AnalyticsFixtures::projectUrl($projectA, 'platform-dominance', ['linkId' => (string) $this->ids->linkATiktok]))->assertOk();
    expect($onlyTiktok->json('data.data'))->toBe([['platform' => 'tiktok', 'share' => 100]]);

    $foreignLink = ['linkId' => (string) $this->ids->linkB];
    expect($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'clicks-per-platform', $foreignLink))->assertOk()->json('data.data'))->toBe([])
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'platform-dominance', $foreignLink))->assertOk()->json('data.data'))->toBe([])
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'device-breakdown', $foreignLink))->assertOk()->json('data'))->toBe([
            'message' => 'Device breakdown retrieved', 'mobile' => 0, 'tablet' => 0, 'desktop' => 0,
        ])
        ->and($this->getJson(AnalyticsFixtures::projectUrl($projectA, 'device-breakdown'))->json('data.total'))->toBe(6);
});

test('malformed project IDs return 400 on every endpoint', function (string $projectId) {
    foreach (AnalyticsFixtures::metrics() as $metric) {
        $this->getJson(AnalyticsFixtures::projectUrl($projectId, $metric))
            ->assertStatus(400)
            ->assertExactJson(['message' => 'Use a valid project ID.']);
    }
})->with(['bad', '123', 'zzzzzzzzzzzzzzzzzzzzzzzz', '123456789012', '507f1f77bcf86cd79943901', '507f1f77bcf86cd7994390111']);

test('malformed link IDs return 400 on every endpoint', function (array $query) {
    foreach (AnalyticsFixtures::metrics() as $metric) {
        $this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, $metric, $query))
            ->assertStatus(400)
            ->assertExactJson(['message' => 'A valid project ID is required']);
    }
})->with([
    'malformed' => [['linkId' => 'bad']],
    'explicitly empty' => [['linkId' => '']],
    'blank' => [['linkId' => '   ']],
    'array' => [['linkId' => ['x']]],
    'object' => [['linkId' => ['$ne' => 'x']]],
    'number' => [['linkId' => '123']],
]);

test('empty projects return zeroed bodies', function () {
    $empty = $this->ids->projectEmpty;
    $get = fn (string $metric): array => $this->getJson(AnalyticsFixtures::projectUrl($empty, $metric))->assertOk()->json('data');

    expect($get('platform-dominance')['data'])->toBe([])
        ->and($get('human-confidence')['confidence'])->toBe(0)
        ->and($get('device-breakdown'))->toBe(['message' => 'Device breakdown retrieved', 'mobile' => 0, 'tablet' => 0, 'desktop' => 0])
        ->and($get('hero-campaign'))->toBe(['message' => 'Hero campaign retrieved', 'campaignId' => null, 'title' => null, 'clickCount' => 0])
        ->and($get('velocity')['growth'])->toBe(0)
        ->and($get('network-effect'))->toMatchArray(['totalClicks' => 0, 'uniqueVisitors' => 0, 'ratio' => 0]);

    $health = $get('monthly-health');
    expect($health['networkEffect']['totalClicks'])->toBe(0)
        ->and($health['dominance'])->toBe([])
        ->and($health['velocity'])->toBe(['growth' => 0])
        ->and($health['heroCampaign'])->toBe(['campaignId' => null, 'title' => null, 'clickCount' => 0]);
});

test('clicks on deleted links count toward dominance totals but not platform joins', function () {
    $this->fixtures->click($this->ids->projectA, new ObjectId, new ObjectId, ['ip' => '10.9.9.9']);

    $shares = array_column($this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, 'platform-dominance'))->assertOk()->json('data.data'), 'share');
    $counts = array_column($this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, 'clicks-per-platform'))->json('data.data'), 'count');

    expect(array_sum($shares))->toBeLessThan(100)
        ->and(array_sum($counts))->toBe(6)
        ->and($this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, 'recent-activity'))->json('data.data.0'))->not->toHaveKey('platform');
});

test('hero campaign returns a null title when the campaign was deleted', function () {
    $deletedCampaign = new ObjectId;
    foreach (range(1, 5) as $i) {
        $this->fixtures->click($this->ids->projectA, $deletedCampaign, $this->ids->linkAYoutube);
    }

    expect($this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, 'hero-campaign'))->json('data'))->toBe([
        'message' => 'Hero campaign retrieved', 'campaignId' => (string) $deletedCampaign, 'title' => null, 'clickCount' => 5,
    ]);
});

test('monthly health agrees with the standalone endpoints for the same scope', function (?string $link) {
    $query = $link === null ? [] : ['linkId' => (string) $this->ids->{$link}];
    $get = fn (string $metric): array => $this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, $metric, $query))->assertOk()->json('data');
    $byPlatform = fn (array $rows): array => collect($rows)->sortBy('platform')->values()->all();

    $health = $get('monthly-health');
    $network = $get('network-effect');
    $hero = $get('hero-campaign');

    expect($health['message'])->toBe('Monthly health retrieved')
        ->and(array_keys($health))->toBe(['message', 'networkEffect', 'dominance', 'velocity', 'heroCampaign'])
        ->and($health['networkEffect'])->toBe(array_diff_key($network, ['message' => true]))
        ->and($byPlatform($health['dominance']))->toBe($byPlatform($get('platform-dominance')['data']))
        ->and($health['velocity'])->toBe(['growth' => $get('velocity')['growth']])
        ->and($health['heroCampaign'])->toBe(array_diff_key($hero, ['message' => true]));
})->with([null, 'linkAYoutube']);

test('velocity compares the last 30 days with the 30 days before', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = $this->fixtures->link($project, $campaign, 'twitch');
    $at = fn (float $days) => $this->fixtures->click($project, $campaign, $link, ['clickedAt' => AnalyticsFixtures::daysAgo($days)]);
    $growth = fn (): int|float => $this->getJson(AnalyticsFixtures::projectUrl($project, 'velocity'))->json('data.growth');

    $at(29.9);
    expect($growth())->toBe(100);

    $at(30.1);
    $at(59.9);
    $at(61);
    expect($growth())->toBe(-50);

    $at(1);
    $at(2);
    $at(0);
    expect($growth())->toBe(100);

    $at(45);
    expect($growth())->toBe(33.3);
});

test('analytics requires authentication', function () {
    $this->app['auth']->forgetGuards();

    $this->getJson('/api/v1/analytics/overview')->assertUnauthorized();

    foreach (AnalyticsFixtures::metrics() as $metric) {
        $this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, $metric))->assertUnauthorized();
    }
});

test('another user\'s project is a 404 and owners only see their own clicks', function () {
    $intruder = $this->fixtures->user();
    $intruderProject = $this->fixtures->project($intruder);
    Sanctum::actingAs($intruder);

    foreach (AnalyticsFixtures::metrics() as $metric) {
        $this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, $metric))
            ->assertNotFound()
            ->assertExactJson(['message' => 'Project not found.']);
    }

    $this->getJson(AnalyticsFixtures::projectUrl(new ObjectId, 'loyalty'))->assertNotFound();
    expect($this->getJson(AnalyticsFixtures::projectUrl($intruderProject, 'clicks-per-platform'))->assertOk()->json('data.data'))->toBe([]);
});

test('users who have not finished onboarding are blocked', function () {
    Sanctum::actingAs($this->fixtures->user(['onboardingStep' => 'socials']));

    $this->getJson(AnalyticsFixtures::projectUrl($this->ids->projectA, 'loyalty'))->assertForbidden();
    $this->getJson('/api/v1/analytics/overview')->assertForbidden();
});
