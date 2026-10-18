<?php

use Laravel\Sanctum\Sanctum;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Port of the old A4 repeat-audience suite. Within project A, visitor A has 3 clicks (on
| different IPs, one a bot) and visitor B has 1 (sharing an IP with A), plus 2 historical
| unidentified clicks (missing and null visitorId).
*/

const VISITOR_A = 'a4-visitor-a-cookie-hmac-1';
const VISITOR_B = 'a4-visitor-b-cookie-hmac-2';

beforeEach(function () {
    $fixtures = $this->fixtures = new AnalyticsFixtures;
    $owner = $fixtures->user();
    $projectA = $fixtures->project($owner);
    $projectB = $fixtures->project($owner);
    $projectEmpty = $fixtures->project($owner);
    $campaignA = $fixtures->campaign($projectA);
    $campaignB = $fixtures->campaign($projectB);
    $linkAYoutube = $fixtures->link($projectA, $campaignA, 'youtube');
    $linkATiktok = $fixtures->link($projectA, $campaignA, 'tiktok');
    $linkB = $fixtures->link($projectB, $campaignB, 'youtube');
    $base = ['clickedAt' => AnalyticsFixtures::date(1_789_041_600_000), 'dayOfWeek' => 3, 'hourOfDay' => 12];

    $fixtures->click($projectA, $campaignA, $linkAYoutube, [...$base, 'ip' => '10.0.0.1', 'visitorId' => VISITOR_A, 'visitorVersion' => 1]);
    $fixtures->click($projectA, $campaignA, $linkAYoutube, [...$base, 'ip' => '10.0.0.2', 'visitorId' => VISITOR_A, 'visitorVersion' => 1, 'isBot' => true]);
    $fixtures->click($projectA, $campaignA, $linkAYoutube, [...$base, 'ip' => '10.0.0.3', 'visitorId' => VISITOR_A, 'visitorVersion' => 1]);
    $fixtures->click($projectA, $campaignA, $linkATiktok, [...$base, 'ip' => '10.0.0.1', 'visitorId' => VISITOR_B, 'visitorVersion' => 1]);
    $fixtures->click($projectA, $campaignA, $linkATiktok, [...$base, 'ip' => '10.0.0.4']);
    $fixtures->click($projectA, $campaignA, $linkATiktok, [...$base, 'ip' => '10.0.0.5', 'visitorId' => null]);

    $fixtures->click($projectB, $campaignB, $linkB, [...$base, 'ip' => '192.168.0.1', 'visitorId' => 'a4-other-project-visitor-1', 'visitorVersion' => 1]);
    $fixtures->click($projectB, $campaignB, $linkB, [...$base, 'ip' => '192.168.0.2', 'visitorId' => 'a4-other-project-visitor-2', 'visitorVersion' => 1]);

    $this->ids = (object) compact('projectA', 'projectB', 'projectEmpty', 'campaignA', 'linkAYoutube', 'linkATiktok', 'linkB');

    Sanctum::actingAs($owner);
});

afterEach(function () {
    $this->fixtures->cleanup();
});

function audienceGet(object $test, string $metric, mixed $project, array $query = []): array
{
    return $test->getJson(AnalyticsFixtures::projectUrl($project, $metric, $query))->assertOk()->json('data');
}

test('loyalty returns the acceptance fixture alongside the legacy IP fields', function () {
    expect(audienceGet($this, 'loyalty', $this->ids->projectA))->toBe([
        'message' => 'Loyalty metrics retrieved',
        'uniqueIPs' => 5,
        'totalClicks' => 6,
        'ratio' => 0.83,
        'identifiedClicks' => 4,
        'unidentifiedClicks' => 2,
        'uniqueVisitors' => 2,
        'repeatVisitors' => 1,
        'repeatVisitorPercent' => 50,
        'clicksPerVisitor' => 2,
        'identityCoveragePercent' => 66.7,
        'identityMethod' => 'first-party-cookie-v1',
    ]);
});

test('cookie identity follows the cookie, not the IP', function () {
    $loyalty = audienceGet($this, 'loyalty', $this->ids->projectA);

    expect($loyalty['uniqueVisitors'])->toBe(2)
        ->and($loyalty['uniqueIPs'])->toBe(5);
});

test('network effect keeps legacy top-level fields and an audience that agrees with loyalty', function () {
    $loyalty = audienceGet($this, 'loyalty', $this->ids->projectA);
    $network = audienceGet($this, 'network-effect', $this->ids->projectA);

    expect($network['totalClicks'])->toBe(6)
        ->and($network['uniqueVisitors'])->toBe(5)
        ->and($network['ratio'])->toBe(1.2)
        ->and($network['audience'])->toBe(array_intersect_key($loyalty, $network['audience']))
        ->and(array_keys($network['audience']))->toBe([
            'identifiedClicks', 'unidentifiedClicks', 'uniqueVisitors', 'repeatVisitors',
            'repeatVisitorPercent', 'clicksPerVisitor', 'identityCoveragePercent', 'identityMethod',
        ]);
});

test('monthly health audience agrees with the standalone network effect', function () {
    $network = audienceGet($this, 'network-effect', $this->ids->projectA);
    $health = audienceGet($this, 'monthly-health', $this->ids->projectA);

    expect($health['networkEffect'])->toBe(array_diff_key($network, ['message' => true]));
});

test('efficiency rows keep legacy intent and add a per-platform audience', function () {
    $rows = collect(audienceGet($this, 'efficiency', $this->ids->projectA)['data'])->keyBy('platform');

    expect($rows['youtube'])->toBe([
        'platform' => 'youtube',
        'intent' => 1,
        'audience' => [
            'identifiedClicks' => 3, 'unidentifiedClicks' => 0, 'uniqueVisitors' => 1,
            'uniqueVisitorFraction' => 0.33, 'identityCoveragePercent' => 100, 'identityMethod' => 'first-party-cookie-v1',
        ],
    ])->and($rows['tiktok'])->toBe([
        'platform' => 'tiktok',
        'intent' => 1,
        'audience' => [
            'identifiedClicks' => 1, 'unidentifiedClicks' => 2, 'uniqueVisitors' => 1,
            'uniqueVisitorFraction' => 1, 'identityCoveragePercent' => 33.3, 'identityMethod' => 'first-party-cookie-v1',
        ],
    ]);
});

test('link and project scopes are isolated', function () {
    expect(audienceGet($this, 'loyalty', $this->ids->projectA, ['linkId' => (string) $this->ids->linkAYoutube]))->toMatchArray([
        'totalClicks' => 3, 'identifiedClicks' => 3, 'unidentifiedClicks' => 0, 'uniqueVisitors' => 1,
        'repeatVisitors' => 1, 'repeatVisitorPercent' => 100, 'clicksPerVisitor' => 3,
    ])->and(audienceGet($this, 'loyalty', $this->ids->projectA, ['linkId' => (string) $this->ids->linkB]))->toMatchArray([
        'totalClicks' => 0, 'identifiedClicks' => 0, 'uniqueVisitors' => 0,
    ])->and(audienceGet($this, 'loyalty', $this->ids->projectB))->toMatchArray([
        'totalClicks' => 2, 'uniqueVisitors' => 2,
    ]);
});

test('empty scopes return zero visitor metrics', function () {
    expect(audienceGet($this, 'loyalty', $this->ids->projectEmpty))->toMatchArray([
        'totalClicks' => 0, 'ratio' => 0, 'identifiedClicks' => 0, 'unidentifiedClicks' => 0, 'uniqueVisitors' => 0,
        'repeatVisitors' => 0, 'repeatVisitorPercent' => 0, 'clicksPerVisitor' => 0, 'identityCoveragePercent' => 0,
    ]);
});

test('blank and non-string visitor IDs are unidentified and never shared', function () {
    foreach (['', '   ', 42] as $visitorId) {
        foreach (range(1, 2) as $i) {
            $this->fixtures->click($this->ids->projectA, $this->ids->campaignA, $this->ids->linkATiktok, ['visitorId' => $visitorId]);
        }
    }

    expect(audienceGet($this, 'loyalty', $this->ids->projectA))->toMatchArray([
        'totalClicks' => 12, 'identifiedClicks' => 4, 'unidentifiedClicks' => 8, 'uniqueVisitors' => 2, 'repeatVisitors' => 1,
    ]);
});

test('no analytics response exposes visitor IDs or IPs', function () {
    foreach (AnalyticsFixtures::metrics() as $metric) {
        $response = $this->get(AnalyticsFixtures::projectUrl($this->ids->projectA, $metric))->assertOk();
        $body = $metric === 'export' ? $response->streamedContent() : $response->getContent();

        expect($body)->not->toContain(VISITOR_A)
            ->not->toContain(VISITOR_B)
            ->not->toContain('visitorId')
            ->not->toContain('visitorVersion')
            ->not->toContain('10.0.0.');
    }
});
