<?php

use App\Services\Analytics\TrafficQuality;
use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

beforeEach(function () {
    $this->fixtures = new AnalyticsFixtures;
    $this->owner = $this->fixtures->user();
    $this->project = $this->fixtures->project($this->owner);
    $this->campaign = $this->fixtures->campaign($this->project);
    $this->link = $this->fixtures->link($this->project, $this->campaign, 'youtube');
});

afterEach(function () {
    $this->fixtures->cleanup();
});

/** @param array<string, mixed> $attributes @param list<string> $unset */
function trafficQualityClick(object $test, int $seconds, array $attributes = [], array $unset = []): ObjectId
{
    return $test->fixtures->click($test->project, $test->campaign, $test->link, [
        'clickedAt' => AnalyticsFixtures::date(1_767_225_600_000 + $seconds * 1000),
        'visitorId' => 'tq-private-cookie',
        'visitorVersion' => 1,
        'ip' => '198.51.100.17',
        ...$attributes,
    ], $unset);
}

/** @param array<string, mixed> $query @return array<string, mixed> */
function trafficQualityGet(object $test, array $query = []): array
{
    Sanctum::actingAs($test->owner);

    return $test->getJson(AnalyticsFixtures::projectUrl($test->project, 'traffic-quality', $query))
        ->assertOk()->json('data');
}

/** @param array<string, mixed> $data @return array<string, int> */
function trafficQualityCounts(array $data): array
{
    return array_column($data['buckets'], 'clicks', 'reason');
}

test('traffic quality returns 401 without authentication', function () {
    $this->getJson(AnalyticsFixtures::projectUrl($this->project, 'traffic-quality'))->assertUnauthorized();
});

test('traffic quality returns 404 for another users project', function () {
    Sanctum::actingAs($this->fixtures->user());

    $this->getJson(AnalyticsFixtures::projectUrl($this->project, 'traffic-quality'))
        ->assertNotFound()->assertJsonPath('message', 'Project not found.');
});

test('traffic quality returns 400 for a malformed project ID', function () {
    Sanctum::actingAs($this->owner);

    $this->getJson(AnalyticsFixtures::projectUrl('invalid', 'traffic-quality'))
        ->assertStatus(400)->assertJsonPath('message', 'Use a valid project ID.');
});

test('traffic quality returns 400 for malformed optional scope IDs', function (array $query) {
    Sanctum::actingAs($this->owner);

    $this->getJson(AnalyticsFixtures::projectUrl($this->project, 'traffic-quality', $query))
        ->assertStatus(400)->assertJsonPath('message', 'A valid project ID is required');
})->with([
    'malformed link' => [['linkId' => 'invalid']],
    'empty link' => [['linkId' => '']],
    'array link' => [['linkId' => ['$ne' => '']]],
    'malformed campaign' => [['campaignId' => 'invalid']],
    'empty campaign' => [['campaignId' => '']],
    'array campaign' => [['campaignId' => ['$ne' => '']]],
]);

test('traffic quality classifies every click once with exact counts and no private identifiers', function () {
    $this->travelTo(now()->setDate(2026, 10, 17)->setTime(12, 0));
    trafficQualityClick($this, 0);
    trafficQualityClick($this, 1, ['isBot' => true]);
    trafficQualityClick($this, 2, ['isBot' => null]);
    trafficQualityClick($this, 3, [], ['isBot']);
    trafficQualityClick($this, 10);
    trafficQualityClick($this, 21);
    trafficQualityClick($this, 32);
    trafficQualityClick($this, 43);
    trafficQualityClick($this, 44, ['visitorId' => null, 'ip' => null]);
    trafficQualityClick($this, 45, [], ['visitorId', 'ip']);
    trafficQualityClick($this, 46, ['visitorId' => 'tq-other-private-cookie']);

    $data = trafficQualityGet($this);

    expect(array_keys($data))->toBe([
        'message', 'totalClicks', 'verifiedHumanClicks', 'verifiedShare', 'uniqueVerifiedVisitors',
        'grade', 'buckets', 'methodology', 'period', 'generatedAt',
    ]);
    expect($data)->toMatchArray([
        'message' => 'Traffic quality calculated', 'totalClicks' => 11,
        'verifiedHumanClicks' => 6, 'verifiedShare' => 54.5,
        'uniqueVerifiedVisitors' => 2, 'grade' => 'C',
        'period' => ['from' => '2026-01-01T00:00:00.000Z', 'to' => '2026-01-01T00:00:46.000Z'],
        'generatedAt' => '2026-10-17T12:00:00.000Z',
    ]);
    expect(trafficQualityCounts($data))->toBe([
        'bot' => 1, 'unclassified' => 2, 'burst' => 1, 'duplicate' => 1, 'unidentified' => 2, 'verified' => 4,
    ]);
    expect(array_column($data['buckets'], 'share'))->toBe([9.1, 18.2, 9.1, 9.1, 18.2, 36.4]);
    expect(array_column($data['buckets'], 'filtered'))->toBe([true, true, true, true, false, false]);
    foreach ($data['buckets'] as $bucket) {
        expect(array_keys($bucket))->toBe(['reason', 'label', 'clicks', 'share', 'filtered', 'description']);
        expect($bucket['label'])->toBeString()->not->toBeEmpty();
        expect($bucket['description'])->toBeString()->not->toBeEmpty();
    }
    expect($data['methodology'])->not->toBeEmpty();
    expect(json_encode($data))->not->toContain('tq-private-cookie')
        ->not->toContain('tq-other-private-cookie')->not->toContain('198.51.100.17')
        ->not->toContain('visitorId')->not->toContain('visitorVersion');
});

test('traffic quality applies bot and unclassified precedence and uses the previous click of any type', function () {
    trafficQualityClick($this, 0);
    trafficQualityClick($this, 1, ['isBot' => true]);
    trafficQualityClick($this, 2, ['isBot' => null]);
    trafficQualityClick($this, 12);
    trafficQualityClick($this, 23);

    expect(trafficQualityCounts(trafficQualityGet($this)))->toBe([
        'bot' => 1, 'unclassified' => 1, 'burst' => 1, 'duplicate' => 0, 'unidentified' => 0, 'verified' => 2,
    ]);
});

test('traffic quality includes the exact burst boundary and excludes window plus one second', function () {
    trafficQualityClick($this, 0);
    trafficQualityClick($this, 10);
    trafficQualityClick($this, 21);

    expect(trafficQualityCounts(trafficQualityGet($this)))->toBe([
        'bot' => 0, 'unclassified' => 0, 'burst' => 1, 'duplicate' => 0, 'unidentified' => 0, 'verified' => 2,
    ]);
});

test('traffic quality measures bursts from the immediately previous repeat rather than the burst start', function () {
    foreach ([0, 9, 18, 27, 38] as $second) {
        trafficQualityClick($this, $second);
    }

    expect(trafficQualityCounts(trafficQualityGet($this)))->toMatchArray(['burst' => 3, 'verified' => 2, 'duplicate' => 0]);
});

test('traffic quality does not let burst repeats or non-human clicks consume the duplicate allowance', function () {
    foreach ([0, 1, 2, 13, 24, 35, 36] as $second) {
        trafficQualityClick($this, $second);
    }
    trafficQualityClick($this, 14, ['isBot' => true]);
    trafficQualityClick($this, 15, ['isBot' => null]);
    // Move the third eligible click beyond the legacy click's burst window.
    // The 24-second click is a burst, so the 35-second click is the third eligible click.
    trafficQualityClick($this, 47);

    expect(trafficQualityCounts(trafficQualityGet($this)))->toBe([
        'bot' => 1, 'unclassified' => 1, 'burst' => 4, 'duplicate' => 1, 'unidentified' => 0, 'verified' => 3,
    ]);
});

test('traffic quality falls back to IP and filters duplicates without counting IPs as visitors', function () {
    trafficQualityClick($this, 0, [], ['visitorId']);
    trafficQualityClick($this, 10, ['visitorId' => null]);
    trafficQualityClick($this, 21, ['visitorId' => '']);
    trafficQualityClick($this, 32, ['visitorId' => '   ']);
    trafficQualityClick($this, 43, ['visitorId' => 42]);

    $data = trafficQualityGet($this);

    expect(trafficQualityCounts($data))->toBe([
        'bot' => 0, 'unclassified' => 0, 'burst' => 1, 'duplicate' => 1, 'unidentified' => 0, 'verified' => 3,
    ]);
    expect($data['uniqueVerifiedVisitors'])->toBe(0);
});

test('traffic quality never merges unidentified humans into bursts or duplicates', function () {
    foreach ([[], ['visitorId' => null, 'ip' => null], ['visitorId' => '', 'ip' => ''], ['visitorId' => ' ', 'ip' => ' '], ['visitorId' => 42, 'ip' => ['bad']]] as $index => $attributes) {
        trafficQualityClick($this, $index, $attributes, $index === 0 ? ['visitorId', 'ip'] : []);
    }
    trafficQualityClick($this, 5, ['isBot' => 'false', 'visitorId' => null, 'ip' => null]);

    $data = trafficQualityGet($this);

    expect(trafficQualityCounts($data))->toBe([
        'bot' => 0, 'unclassified' => 1, 'burst' => 0, 'duplicate' => 0, 'unidentified' => 5, 'verified' => 0,
    ]);
    expect($data)->toMatchArray(['verifiedHumanClicks' => 5, 'uniqueVerifiedVisitors' => 0, 'verifiedShare' => 83.3, 'grade' => 'B']);
});

test('traffic quality follows cookie identity across IPs and keeps shared IP cookies separate', function () {
    trafficQualityClick($this, 0, ['ip' => '198.51.100.1']);
    trafficQualityClick($this, 1, ['ip' => '198.51.100.2']);
    trafficQualityClick($this, 2, ['ip' => '198.51.100.1', 'visitorId' => 'tq-second-cookie']);

    $data = trafficQualityGet($this);

    expect(trafficQualityCounts($data))->toMatchArray(['burst' => 1, 'verified' => 2]);
    expect($data['uniqueVerifiedVisitors'])->toBe(2);
});

test('traffic quality isolates links while counting a verified visitor once across links', function () {
    foreach ([0, 11, 22, 33] as $second) {
        trafficQualityClick($this, $second);
    }
    $otherLink = $this->fixtures->link($this->project, $this->campaign, 'tiktok');
    trafficQualityClick($this, 33, ['link' => $otherLink]);

    $data = trafficQualityGet($this);

    expect(trafficQualityCounts($data))->toMatchArray(['burst' => 0, 'duplicate' => 1, 'verified' => 4]);
    expect($data['uniqueVerifiedVisitors'])->toBe(1);
    expect(trafficQualityGet($this, ['linkId' => (string) $otherLink]))->toMatchArray(['totalClicks' => 1, 'verifiedHumanClicks' => 1]);
});

test('traffic quality applies project campaign and link scopes including intersections', function () {
    trafficQualityClick($this, 0);
    $otherCampaign = $this->fixtures->campaign($this->project);
    $otherLink = $this->fixtures->link($this->project, $otherCampaign, 'tiktok');
    trafficQualityClick($this, 0, ['campaign' => $otherCampaign, 'link' => $otherLink, 'isBot' => true]);
    $otherProject = $this->fixtures->project($this->owner);
    $outsideCampaign = $this->fixtures->campaign($otherProject);
    $outsideLink = $this->fixtures->link($otherProject, $outsideCampaign, 'youtube');
    $this->fixtures->click($otherProject, $outsideCampaign, $outsideLink);

    expect(trafficQualityGet($this))->toMatchArray(['totalClicks' => 2, 'verifiedHumanClicks' => 1]);
    expect(trafficQualityGet($this, ['campaignId' => (string) $this->campaign]))->toMatchArray(['totalClicks' => 1, 'verifiedHumanClicks' => 1]);
    expect(trafficQualityGet($this, ['campaignId' => (string) $otherCampaign, 'linkId' => (string) $otherLink]))->toMatchArray(['totalClicks' => 1, 'verifiedHumanClicks' => 0]);
    expect(trafficQualityGet($this, ['campaignId' => (string) $this->campaign, 'linkId' => (string) $otherLink]))->toMatchArray(['totalClicks' => 0, 'grade' => null]);
    expect(trafficQualityGet($this, ['linkId' => (string) $outsideLink]))->toMatchArray(['totalClicks' => 0]);
    expect(app(TrafficQuality::class)->compute(['campaign' => $this->campaign]))->toMatchArray(['totalClicks' => 1, 'verifiedHumanClicks' => 1]);

    $this->getJson(AnalyticsFixtures::projectUrl($this->project, 'traffic-quality', ['campaignId' => (string) $outsideCampaign]))
        ->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
});

test('traffic quality returns all six zero buckets and a null grade and period for an empty scope', function () {
    $data = trafficQualityGet($this);

    expect($data)->toMatchArray([
        'totalClicks' => 0, 'verifiedHumanClicks' => 0, 'verifiedShare' => 0,
        'uniqueVerifiedVisitors' => 0, 'grade' => null, 'period' => null,
    ]);
    expect(trafficQualityCounts($data))->toBe([
        'bot' => 0, 'unclassified' => 0, 'burst' => 0, 'duplicate' => 0, 'unidentified' => 0, 'verified' => 0,
    ]);
    expect(array_column($data['buckets'], 'share'))->toBe([0, 0, 0, 0, 0, 0]);
});

test('traffic quality uses configured classification limits grades and bucket copy', function () {
    config([
        'sponsor.traffic_quality.burst_window_seconds' => 2,
        'sponsor.traffic_quality.max_clicks_per_visitor_per_link' => 2,
        'sponsor.traffic_quality.grade_thresholds' => ['A' => 40, 'B' => 30, 'C' => 20],
        'sponsor.traffic_quality.buckets.verified.label' => 'Accepted clicks',
        'sponsor.traffic_quality.buckets.verified.description' => 'Configured description.',
    ]);
    foreach ([0, 2, 5, 8] as $second) {
        trafficQualityClick($this, $second);
    }

    $data = trafficQualityGet($this);

    expect(trafficQualityCounts($data))->toMatchArray(['burst' => 1, 'duplicate' => 1, 'verified' => 2]);
    expect($data)->toMatchArray(['verifiedShare' => 50, 'grade' => 'A']);
    expect($data['buckets'][5])->toMatchArray(['label' => 'Accepted clicks', 'description' => 'Configured description.']);
    expect(implode(' ', $data['methodology']))->toContain('at most 2 seconds')->toContain('first 2 non-burst human clicks');
});

test('traffic quality assigns default grade thresholds through the endpoint', function (int $humans, string $grade) {
    foreach (range(1, 100) as $index) {
        trafficQualityClick($this, $index, ['visitorId' => "tq-grade-{$index}", 'isBot' => $index > $humans]);
    }

    expect(trafficQualityGet($this))->toMatchArray(['verifiedShare' => $humans, 'grade' => $grade]);
})->with([[85, 'A'], [84, 'B'], [70, 'B'], [69, 'C'], [50, 'C'], [49, 'D'], [0, 'D']]);

test('traffic quality resolves equal timestamps by click ID independent of insertion order', function () {
    $later = new ObjectId('000000000000000000000002');
    $earlier = new ObjectId('000000000000000000000001');
    trafficQualityClick($this, 0, ['_id' => $later]);
    trafficQualityClick($this, 0, ['_id' => $earlier, 'isBot' => true]);

    $first = trafficQualityGet($this);
    $second = trafficQualityGet($this);

    expect(trafficQualityCounts($first))->toMatchArray(['bot' => 1, 'burst' => 1, 'verified' => 0]);
    expect(trafficQualityCounts($second))->toBe(trafficQualityCounts($first));
});
