<?php

use App\Models\User;
use App\Services\Analytics\GeoValue;
use Tests\Feature\SponsorReports\Support\SponsorReportFixtures;

const PUBLIC_TOKEN = 'PublicToken0000000000000000000000000000abcd';

function publicUrl(string $token = PUBLIC_TOKEN): string
{
    return "/api/v1/public/reports/{$token}";
}

it('serves the full report to anyone holding the link', function () {
    $fixture = SponsorReportFixtures::seed(withDeal: true);
    $fixture->report(PUBLIC_TOKEN, ['title' => 'Spring launch results', 'sections' => ['dealValue' => true]]);

    $response = $this->getJson(publicUrl())->assertOk()
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
        ->assertJsonPath('data.report.title', 'Spring launch results')
        ->assertJsonPath('data.report.sections', ['headline', 'trafficQuality', 'geo', 'decay', 'dealValue', 'links', 'audience'])
        ->assertJsonPath('data.report.unavailableSections', [])
        ->assertJsonPath('data.creator.displayName', 'Ada Creator')
        ->assertJsonPath('data.creator.handle', 'adacreates')
        ->assertJsonPath('data.creator.totalFollowers', 150500)
        ->assertJsonPath('data.creator.socials.0.platform', 'youtube')
        ->assertJsonPath('data.creator.socials.0.followers', 120000)
        ->assertJsonPath('data.creator.socials.0.approximate', true)
        ->assertJsonCount(2, 'data.creator.socials')
        ->assertJsonMissingPath('data.creator.socials.1.lastError')
        ->assertJsonPath('data.campaign.title', 'Spring launch')
        ->assertJsonPath('data.campaign.url', 'https://sponsor.example/landing')
        ->assertJsonPath('data.trafficQuality.totalClicks', 12)
        ->assertJsonPath('data.trafficQuality.verifiedHumanClicks', 10)
        ->assertJsonPath('data.geo.humanClicks', 10)
        ->assertJsonPath('data.geo.tier1Share', 60)
        ->assertJsonPath('data.decay.humanClicks', 10)
        ->assertJsonPath('data.decay.shareAfterDay7', 40)
        ->assertJsonCount(90, 'data.decay.curve')
        ->assertJsonPath('data.dealValue.deal.amount', 500)
        ->assertJsonPath('data.dealValue.humanClicks', 10)
        ->assertJsonPath('data.dealValue.effectiveCpc', 50)
        ->assertJsonPath('data.audience.humanClicks', 10)
        ->assertJsonPath('data.audience.topCountries.0', ['country' => 'US', 'clicks' => 6, 'share' => 60])
        ->assertJsonPath('data.audience.devices.0', ['type' => 'desktop', 'clicks' => 6, 'share' => 60])
        ->assertJsonCount(30, 'data.audience.clicksByDay')
        ->assertJsonPath('data.audience.clicksByDay.29.date', now()->utc()->format('Y-m-d'))
        ->assertJsonPath('data.audience.clicksByDay.28.clicks', 1);

    expect($response->headers->get('Cache-Control'))->toContain('no-store');
    expect($response->json('data.report.period.from'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/');

    expect($response->json('data.links'))->toBe([
        ['title' => 'YouTube video', 'platform' => 'youtube', 'url' => $fixture->links['youtube']->customUrl,
            'publishedAt' => $fixture->links['youtube']->createdAt->utc()->format('Y-m-d\TH:i:s.v\Z'), 'humanClicks' => 9, 'share' => 90],
        ['title' => 'Instagram story', 'platform' => 'instagram', 'url' => $fixture->links['instagram']->customUrl,
            'publishedAt' => $fixture->links['instagram']->createdAt->utc()->format('Y-m-d\TH:i:s.v\Z'), 'humanClicks' => 1, 'share' => 10],
    ]);

    $stats = collect($response->json('data.headline.stats'));
    expect($stats->count())->toBeLessThanOrEqual(4);
    expect($stats->pluck('key')->all())->toBe(['verifiedHumanClicks', 'verifiedShare', 'tier1Share', 'shareAfterDay7']);
    expect($stats->firstWhere('key', 'verifiedHumanClicks')['value'])->toBe(10);
    expect($response->json('data.headline.grade'))->toBe($response->json('data.trafficQuality.grade'));
    expect($response->json('data.headline.summary'))->toStartWith('10 verified human clicks');
});

it('headlines the CPC multiple when the deal is shown and beats paid ads', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->setDeal([...SponsorReportFixtures::DEAL, 'amount' => 1]);
    $fixture->report(PUBLIC_TOKEN, ['sections' => ['dealValue' => true]]);

    $response = $this->getJson(publicUrl())->assertOk();
    $best = $response->json('data.dealValue.bestComparison');
    $stats = collect($response->json('data.headline.stats'));

    expect($stats)->toHaveCount(4);
    expect($stats->pluck('key')->all())->toBe(['verifiedHumanClicks', 'verifiedShare', 'cpcMultiple', 'tier1Share']);
    expect($stats->firstWhere('key', 'cpcMultiple')['value'])->toBe($best['multiple']);
    expect($stats->firstWhere('key', 'cpcMultiple')['detail'])->toBe('Effective CPC 0.10 USD');
});

it('returns the same 404 for unknown, revoked, expired and malformed tokens', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report('Revoked000000000000000000000000000000000000', ['revokedAt' => now()->subMinute()]);
    $fixture->report('Expired000000000000000000000000000000000000', ['expiresAt' => now()->subMinute()]);

    $bodies = [];
    foreach (['Unknown000000000000000000000000000000000000', 'Revoked000000000000000000000000000000000000', 'Expired000000000000000000000000000000000000', 'short', 'has-dashes-and_underscores-000000000000000'] as $token) {
        $response = $this->getJson(publicUrl($token))->assertNotFound()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        expect($response->headers->get('Cache-Control'))->toContain('no-store');
        $bodies[] = $response->getContent();
    }

    expect(array_unique($bodies))->toBe([json_encode(['message' => 'Report not found.'])]);
});

it('stops serving a report once its campaign is deleted', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report(PUBLIC_TOKEN);
    $fixture->campaign->delete();

    $this->getJson(publicUrl())->assertNotFound()->assertExactJson(['message' => 'Report not found.']);
});

it('stops serving a report once it expires', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report(PUBLIC_TOKEN, ['expiresAt' => now()->addHour()]);

    $this->getJson(publicUrl())->assertOk();
    $this->travel(2)->hours();
    $this->getJson(publicUrl())->assertNotFound();
});

it('counts successful views only', function () {
    $fixture = SponsorReportFixtures::seed();
    $report = $fixture->report(PUBLIC_TOKEN);
    $fixture->report('Revoked000000000000000000000000000000000000', ['revokedAt' => now()]);

    $this->getJson(publicUrl())->assertOk();
    $this->getJson(publicUrl())->assertOk();
    $this->getJson(publicUrl('Revoked000000000000000000000000000000000000'))->assertNotFound();

    $fresh = $report->fresh();
    expect($fresh->viewCount)->toBe(2);
    expect($fresh->lastViewedAt)->not->toBeNull();
    expect($fresh->updatedAt->equalTo($report->updatedAt))->toBeTrue();

    $this->actingAs($fixture->user)->getJson("/api/v1/sponsor-reports/{$report->id}")
        ->assertJsonPath('data.report.viewCount', 2)
        ->assertJsonPath('data.report.lastViewedAt', fn (?string $value) => $value !== null);
});

it('omits disabled sections and keeps the headline to enabled ones', function () {
    $fixture = SponsorReportFixtures::seed(withDeal: true);
    $fixture->report(PUBLIC_TOKEN, ['sections' => ['geo' => false, 'decay' => false, 'links' => false, 'audience' => false, 'trafficQuality' => false]]);

    $response = $this->getJson(publicUrl())->assertOk()
        ->assertJsonPath('data.report.sections', ['headline'])
        ->assertJsonMissingPath('data.geo')
        ->assertJsonMissingPath('data.decay')
        ->assertJsonMissingPath('data.links')
        ->assertJsonMissingPath('data.audience')
        ->assertJsonMissingPath('data.trafficQuality')
        ->assertJsonMissingPath('data.dealValue')
        ->assertJsonPath('data.headline.grade', null)
        ->assertJsonPath('data.creator.handle', 'adacreates')
        ->assertJsonPath('data.campaign.title', 'Spring launch');

    expect(array_column($response->json('data.headline.stats'), 'key'))->toBe(['humanClicks']);
    expect($response->json('data.headline.stats.0.value'))->toBe(10);
});

it('can turn the headline off too', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report(PUBLIC_TOKEN, ['sections' => ['headline' => false]]);

    $this->getJson(publicUrl())->assertOk()
        ->assertJsonMissingPath('data.headline')
        ->assertJsonPath('data.report.sections', ['trafficQuality', 'geo', 'decay', 'links', 'audience']);
});

it('leaves deal value out when the campaign has no deal or the section is off', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report(PUBLIC_TOKEN, ['sections' => ['dealValue' => true]]);
    $this->getJson(publicUrl())->assertOk()
        ->assertJsonMissingPath('data.dealValue')
        ->assertJsonPath('data.report.unavailableSections', []);

    $fixture->setDeal(SponsorReportFixtures::DEAL);
    $other = 'DealOff00000000000000000000000000000000000';
    $fixture->report($other);
    $response = $this->getJson(publicUrl($other))->assertOk()->assertJsonMissingPath('data.dealValue');
    expect(json_encode($response->json()))->not->toContain('effectiveCpc');
});

it('never exposes email, ip, visitor ids or internal ids', function () {
    $fixture = SponsorReportFixtures::seed(withDeal: true);
    $report = $fixture->report(PUBLIC_TOKEN, ['sections' => ['dealValue' => true]]);

    $body = $this->getJson(publicUrl())->assertOk()->getContent();

    foreach ([
        SponsorReportFixtures::EMAIL, SponsorReportFixtures::IP, SponsorReportFixtures::VISITOR_ID, 'later-0', 'insta-1',
        '"ip"', '"visitorId"', '"visitorVersion"', '"email"', '"tokenHash"', '"owner"', '"_id"', 'rate limited',
        'Secret client name', $fixture->user->id, $fixture->project->id, $fixture->campaign->id, $report->id,
        $fixture->links['youtube']->id, $report->tokenHash, PUBLIC_TOKEN,
    ] as $secret) {
        expect($body)->not->toContain($secret);
    }
});

it('works for guests and ignores whoever is signed in', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report(PUBLIC_TOKEN);

    $this->getJson(publicUrl())->assertOk()->assertJsonPath('data.creator.handle', 'adacreates');
    $this->actingAs(User::factory()->withoutUsername()->create())->getJson(publicUrl())->assertOk();
});

it('marks a section unavailable instead of failing when its service breaks', function () {
    $fixture = SponsorReportFixtures::seed();
    $fixture->report(PUBLIC_TOKEN);
    $this->mock(GeoValue::class)->shouldReceive('compute')->andThrow(new RuntimeException('boom'));

    $response = $this->getJson(publicUrl())->assertOk()
        ->assertJsonMissingPath('data.geo')
        ->assertJsonPath('data.report.unavailableSections', ['geo'])
        ->assertJsonPath('data.trafficQuality.verifiedHumanClicks', 10);

    expect(array_column($response->json('data.headline.stats'), 'key'))->not->toContain('tier1Share');
});
