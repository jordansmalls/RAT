<?php

use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Feature A: GET /analytics/project/{projectId}/geo-value. Human clicks only, valued by
| country tier. Covers auth, ownership, link/campaign scoping, bot exclusion, the unknown
| bucket, the hand-computed score and the empty scope.
*/

beforeEach(function () {
    $this->fixtures = new AnalyticsFixtures;
    $this->owner = $this->fixtures->user();
    $this->project = $this->fixtures->project($this->owner);
    $this->campaign = $this->fixtures->campaign($this->project);
    $this->link = $this->fixtures->link($this->project, $this->campaign, 'instagram');
});

afterEach(function () {
    $this->fixtures->cleanup();
});

/**
 * Seed `country => count` human clicks. The key "unknown" stores a null country.
 *
 * @param  array<string, int>  $byCountry
 * @param  array<string, mixed>  $attributes
 */
function geoSeed(object $test, array $byCountry, array $attributes = [], ?ObjectId $link = null, ?ObjectId $campaign = null): void
{
    foreach ($byCountry as $country => $count) {
        for ($i = 0; $i < $count; $i++) {
            $test->fixtures->click(
                $test->project,
                $campaign ?? $test->campaign,
                $link ?? $test->link,
                [...$attributes, 'geo' => ['country' => $country === 'unknown' ? null : $country]],
            );
        }
    }
}

/**
 * @param  array<string, mixed>  $query
 */
function geoResponse(object $test, array $query = [], ?ObjectId $project = null): TestResponse
{
    return $test->getJson(AnalyticsFixtures::projectUrl($project ?? $test->project, 'geo-value', $query));
}

test('unauthenticated requests are rejected', function () {
    geoResponse($this)->assertUnauthorized();
});

test('scores known countries on a hand-computed fixture', function () {
    Sanctum::actingAs($this->owner);
    geoSeed($this, ['US' => 4, 'GB' => 2, 'FR' => 6, 'BR' => 4, 'unknown' => 2]);

    $response = geoResponse($this)
        ->assertOk()
        ->assertJsonPath('data.message', 'Geo value calculated');

    $data = $response->json('data');

    expect($data['score'])->toBe(58.1)
        ->and($data['tier1Share'])->toBe(37.5)
        ->and($data['humanClicks'])->toBe(16)
        ->and($data['unknownClicks'])->toBe(2)
        ->and($data['weights'])->toBe(['tier1' => 1, 'tier2' => 0.45, 'tier3' => 0.15])
        ->and($data['tiers'])->toBe([
            ['tier' => 'tier1', 'weight' => 1, 'clicks' => 6, 'share' => 37.5],
            ['tier' => 'tier2', 'weight' => 0.45, 'clicks' => 6, 'share' => 37.5],
            ['tier' => 'tier3', 'weight' => 0.15, 'clicks' => 4, 'share' => 25],
            ['tier' => 'unknown', 'weight' => 0, 'clicks' => 2, 'share' => 0],
        ])
        ->and(array_column($data['countries'], 'country'))->toBe(['FR', 'BR', 'US', 'GB'])
        ->and($data['countries'][0])->toBe(['country' => 'FR', 'tier' => 'tier2', 'weight' => 0.45, 'clicks' => 6, 'share' => 37.5]);
});

test('bots and missing bot flags are excluded from human clicks', function () {
    Sanctum::actingAs($this->owner);
    $this->fixtures->click($this->project, $this->campaign, $this->link, ['geo' => ['country' => 'US'], 'isBot' => false]);
    $this->fixtures->click($this->project, $this->campaign, $this->link, ['geo' => ['country' => 'US'], 'isBot' => true]);
    $this->fixtures->click($this->project, $this->campaign, $this->link, ['geo' => ['country' => 'US']], ['isBot']);

    $data = geoResponse($this)->assertOk()->json('data');

    expect($data['humanClicks'])->toBe(1)
        ->and($data['score'])->toBe(100)
        ->and($data['tier1Share'])->toBe(100);
});

test('missing and blank countries fall into the unknown bucket', function () {
    Sanctum::actingAs($this->owner);
    $this->fixtures->click($this->project, $this->campaign, $this->link, ['geo' => ['country' => 'US']]);
    $this->fixtures->click($this->project, $this->campaign, $this->link, ['geo' => ['country' => '']]);
    $this->fixtures->click($this->project, $this->campaign, $this->link, unset: ['geo']);
    $this->fixtures->click($this->project, $this->campaign, $this->link, ['geo' => ['country' => 'unknown']]);

    $data = geoResponse($this)->assertOk()->json('data');

    expect($data['humanClicks'])->toBe(1)
        ->and($data['unknownClicks'])->toBe(3)
        ->and($data['score'])->toBe(100)
        ->and($data['tiers'])->toBe([
            ['tier' => 'tier1', 'weight' => 1, 'clicks' => 1, 'share' => 100],
            ['tier' => 'unknown', 'weight' => 0, 'clicks' => 3, 'share' => 0],
        ]);
});

test('link and campaign scopes isolate clicks', function () {
    Sanctum::actingAs($this->owner);
    $linkA = $this->fixtures->link($this->project, $this->campaign, 'instagram');
    $linkB = $this->fixtures->link($this->project, $this->campaign, 'tiktok');
    $campaignB = $this->fixtures->campaign($this->project, ['title' => 'Campaign B']);

    geoSeed($this, ['US' => 3], link: $linkA);
    geoSeed($this, ['GB' => 2], link: $linkB);
    geoSeed($this, ['DE' => 1], link: $linkB, campaign: $campaignB);

    expect(geoResponse($this, ['linkId' => (string) $linkA])->json('data.humanClicks'))->toBe(3)
        ->and(geoResponse($this, ['linkId' => (string) $linkB])->json('data.humanClicks'))->toBe(3)
        ->and(geoResponse($this, ['campaignId' => (string) $campaignB])->json('data.humanClicks'))->toBe(1)
        ->and(geoResponse($this)->json('data.humanClicks'))->toBe(6);
});

test('ownership failures are 404 and malformed ids are 400', function () {
    Sanctum::actingAs($this->owner);
    $theirProject = $this->fixtures->project($this->fixtures->user());

    geoResponse($this, project: $theirProject)
        ->assertNotFound()
        ->assertJson(['message' => 'Project not found.']);

    $this->getJson('/api/v1/analytics/project/not-an-id/geo-value')
        ->assertStatus(400)
        ->assertJson(['message' => 'Use a valid project ID.']);

    geoResponse($this, ['linkId' => 'nope'])
        ->assertStatus(400)
        ->assertJson(['message' => 'A valid project ID is required']);
});

test('a campaign filter must belong to the project', function () {
    Sanctum::actingAs($this->owner);
    $foreignCampaign = $this->fixtures->campaign($this->fixtures->project($this->fixtures->user()));

    geoResponse($this, ['campaignId' => (string) $foreignCampaign])
        ->assertNotFound()
        ->assertJson(['message' => 'Campaign not found.']);
});

test('an empty scope scores zero with empty arrays', function () {
    Sanctum::actingAs($this->owner);

    $data = geoResponse($this)->assertOk()->json('data');

    expect($data['score'])->toBe(0)
        ->and($data['tier1Share'])->toBe(0)
        ->and($data['humanClicks'])->toBe(0)
        ->and($data['unknownClicks'])->toBe(0)
        ->and($data['tiers'])->toBe([])
        ->and($data['countries'])->toBe([])
        ->and($data['weights'])->toBe(['tier1' => 1, 'tier2' => 0.45, 'tier3' => 0.15]);
});
