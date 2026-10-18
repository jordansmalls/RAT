<?php

use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Feature D API: GET /api/v1/analytics/campaign/{campaignId}/deal-value. Only human clicks
| (`isBot === false`) count; unique visitors are distinct non-empty visitorIds counted in
| MongoDB; benchmark comparisons are expressed in the deal currency.
*/

beforeEach(function () {
    $this->fixtures = new AnalyticsFixtures;
    $this->owner = $this->fixtures->user();
    $this->other = $this->fixtures->user();

    $this->seedCampaign = function (array $deal = [], ?object $owner = null): array {
        $project = $this->fixtures->project($owner ?? $this->owner);
        $campaign = $this->fixtures->campaign($project, $deal === [] ? [] : ['deal' => $deal]);

        return [$project, $campaign];
    };

    $this->url = fn (ObjectId $campaign): string => '/api/v1/analytics/campaign/'.$campaign.'/deal-value';
});

afterEach(function () {
    $this->fixtures->cleanup();
});

test('computes effective CPC, equivalent spend, savings and multiples on a hand-checked fixture', function () {
    [$project, $campaign] = ($this->seedCampaign)([
        'amount' => 20.0, 'currency' => 'USD', 'category' => 'saas', 'paidAt' => new UTCDateTime,
    ]);
    $link = $this->fixtures->link($project, $campaign, 'youtube');

    for ($i = 0; $i < 30; $i++) {
        $this->fixtures->click($project, $campaign, $link, ['visitorId' => "v{$i}", 'isBot' => false]);
    }
    for ($i = 0; $i < 10; $i++) {
        $this->fixtures->click($project, $campaign, $link, ['isBot' => false], ['visitorId']);
    }
    foreach ([true, true, null] as $flag) {
        $this->fixtures->click($project, $campaign, $link, ['isBot' => $flag, 'visitorId' => 'bot']);
    }
    $this->fixtures->click($project, $campaign, $link, ['visitorId' => 'bot'], ['isBot']);

    Sanctum::actingAs($this->owner);

    $response = $this->getJson(($this->url)($campaign))
        ->assertOk()
        ->assertJsonPath('data.message', 'Deal value calculated')
        ->assertJsonPath('data.humanClicks', 40)
        ->assertJsonPath('data.uniqueVisitors', 30)
        ->assertJsonPath('data.effectiveCpc', 0.5)
        ->assertJsonPath('data.costPerUniqueVisitor', 0.67)
        ->assertJsonPath('data.deal.amount', 20)
        ->assertJsonPath('data.deal.currency', 'USD')
        ->assertJsonPath('data.deal.category', 'saas')
        ->assertJsonPath('data.bestComparison.channel', 'linkedin')
        ->assertJsonPath('data.bestComparison.multiple', 12.4)
        ->assertJsonPath('data.benchmarkSource', 'Typical 2025-2026 CPC ranges by category; directional, not a quote.')
        ->assertJsonPath('data.currencyNote', 'Benchmarks are USD; non-USD deals are converted at the configured static rate.');

    expect($response->json('data.benchmarks'))->toEqual([
        ['channel' => 'meta', 'label' => 'Meta ads', 'cpc' => 2.10, 'equivalentSpend' => 84.0, 'savings' => 64.0, 'multiple' => 4.20],
        ['channel' => 'google_search', 'label' => 'Google Search ads', 'cpc' => 3.60, 'equivalentSpend' => 144.0, 'savings' => 124.0, 'multiple' => 7.20],
        ['channel' => 'tiktok', 'label' => 'TikTok ads', 'cpc' => 0.90, 'equivalentSpend' => 36.0, 'savings' => 16.0, 'multiple' => 1.80],
        ['channel' => 'youtube_ads', 'label' => 'YouTube ads (per view-click proxy)', 'cpc' => 0.70, 'equivalentSpend' => 28.0, 'savings' => 8.0, 'multiple' => 1.40],
        ['channel' => 'linkedin', 'label' => 'LinkedIn ads', 'cpc' => 6.20, 'equivalentSpend' => 248.0, 'savings' => 228.0, 'multiple' => 12.40],
    ]);
});

test('counts only isBot false clicks as human and treats the campaign scope as a boundary', function () {
    [$project, $campaign] = ($this->seedCampaign)(['amount' => 10.0, 'currency' => 'USD']);
    [$otherProject, $otherCampaign] = ($this->seedCampaign)(['amount' => 10.0, 'currency' => 'USD'], $this->other);
    $link = $this->fixtures->link($project, $campaign, 'meta');

    $this->fixtures->click($project, $campaign, $link, ['isBot' => false, 'visitorId' => 'a']);
    $this->fixtures->click($project, $campaign, $link, ['isBot' => true, 'visitorId' => 'b']);
    $this->fixtures->click($project, $campaign, $link, ['isBot' => null, 'visitorId' => 'c']);
    $this->fixtures->click($project, $campaign, $link, ['visitorId' => 'd'], ['isBot']);
    $this->fixtures->click($otherProject, $otherCampaign, $this->fixtures->link($otherProject, $otherCampaign, 'meta'), ['isBot' => false, 'visitorId' => 'e']);

    Sanctum::actingAs($this->owner);

    $this->getJson(($this->url)($campaign))
        ->assertOk()
        ->assertJsonPath('data.humanClicks', 1)
        ->assertJsonPath('data.uniqueVisitors', 1)
        ->assertJsonPath('data.effectiveCpc', 10)
        ->assertJsonPath('data.costPerUniqueVisitor', 10);
});

test('returns null CPC figures and a null best comparison when there are no human clicks', function () {
    [$project, $campaign] = ($this->seedCampaign)(['amount' => 50.0, 'currency' => 'USD']);
    $this->fixtures->click($project, $campaign, $this->fixtures->link($project, $campaign, 'meta'), ['isBot' => true]);

    Sanctum::actingAs($this->owner);

    $response = $this->getJson(($this->url)($campaign))
        ->assertOk()
        ->assertJsonPath('data.humanClicks', 0)
        ->assertJsonPath('data.uniqueVisitors', 0)
        ->assertJsonPath('data.effectiveCpc', null)
        ->assertJsonPath('data.costPerUniqueVisitor', null)
        ->assertJsonPath('data.bestComparison', null);

    expect(array_column($response->json('data.benchmarks'), 'multiple'))->toBe([null, null, null, null, null])
        ->and(array_column($response->json('data.benchmarks'), 'equivalentSpend'))->toBe([0, 0, 0, 0, 0])
        ->and(array_column($response->json('data.benchmarks'), 'savings'))->toBe([-50, -50, -50, -50, -50]);
});

test('converts USD benchmarks into the deal currency', function () {
    [$project, $campaign] = ($this->seedCampaign)(['amount' => 100.0, 'currency' => 'EUR']);
    $link = $this->fixtures->link($project, $campaign, 'tiktok');

    for ($i = 0; $i < 40; $i++) {
        $this->fixtures->click($project, $campaign, $link, ['visitorId' => "v{$i}", 'isBot' => false]);
    }

    Sanctum::actingAs($this->owner);

    $response = $this->getJson(($this->url)($campaign))
        ->assertOk()
        ->assertJsonPath('data.deal.currency', 'EUR')
        ->assertJsonPath('data.effectiveCpc', 2.5)
        ->assertJsonPath('data.bestComparison.channel', 'linkedin')
        ->assertJsonPath('data.bestComparison.multiple', 2.07);

    $benchmarks = collect($response->json('data.benchmarks'))->keyBy('channel');

    expect($benchmarks['meta']['cpc'])->toBe(1.59)
        ->and($benchmarks['google_search']['cpc'])->toBe(2.49)
        ->and($benchmarks['tiktok']['cpc'])->toBe(0.93)
        ->and($benchmarks['youtube_ads']['cpc'])->toBe(0.45)
        ->and($benchmarks['linkedin']['cpc'])->toBe(5.17)
        ->and($benchmarks['google_search']['multiple'])->toEqual(1);
});

test('falls back to the default benchmarks when the category is null or unknown', function () {
    [$project, $campaign] = ($this->seedCampaign)(['amount' => 10.0, 'currency' => 'USD', 'category' => null]);
    [$project2, $campaign2] = ($this->seedCampaign)(['amount' => 10.0, 'currency' => 'USD', 'category' => 'mystery']);
    $this->fixtures->link($project, $campaign, 'meta');
    $this->fixtures->link($project2, $campaign2, 'meta');

    Sanctum::actingAs($this->owner);

    $expected = ['meta' => 1.72, 'google_search' => 2.69, 'tiktok' => 1.0, 'youtube_ads' => 0.49, 'linkedin' => 5.58];

    foreach ([$campaign, $campaign2] as $id) {
        $cpcs = collect($this->getJson(($this->url)($id))->assertOk()->json('data.benchmarks'))->pluck('cpc', 'channel')->all();
        expect($cpcs)->toEqual($expected);
    }
});

test('requires authentication', function () {
    [$project, $campaign] = ($this->seedCampaign)(['amount' => 1.0, 'currency' => 'USD']);

    $this->getJson(($this->url)($campaign))->assertUnauthorized();
});

test('returns 400 for a malformed campaign id', function (string $id) {
    Sanctum::actingAs($this->owner);

    $this->getJson('/api/v1/analytics/campaign/'.$id.'/deal-value')
        ->assertStatus(400)
        ->assertExactJson(['message' => 'Use a valid campaign ID.']);
})->with(['bad', '123', 'zzzzzzzzzzzzzzzzzzzzzzzz', '507f1f77bcf86cd79943901', '507f1f77bcf86cd7994390111']);

test('returns 404 for another user\'s campaign and for an unknown campaign', function () {
    [, $foreign] = ($this->seedCampaign)(['amount' => 10.0, 'currency' => 'USD'], $this->other);

    Sanctum::actingAs($this->owner);

    $this->getJson(($this->url)($foreign))
        ->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->getJson(($this->url)(new ObjectId))
        ->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
});

test('returns 422 when the campaign has no deal', function () {
    [, $campaign] = ($this->seedCampaign)();

    Sanctum::actingAs($this->owner);

    $this->getJson(($this->url)($campaign))
        ->assertStatus(422)
        ->assertExactJson(['message' => 'This campaign has no deal value yet.']);
});
