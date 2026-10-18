<?php

use App\Models\Campaign;
use App\Models\SponsorReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Tests\Feature\SponsorReports\Support\SponsorReportFixtures;

function storedReport(string $id): array
{
    return (array) DB::connection('mongodb')->getCollection('sponsor_reports')->findOne(['_id' => new ObjectId($id)]);
}

it('creates a report with default sections and returns the plaintext token only once', function () {
    config(['app.frontend_url' => 'https://app.example']);
    $fixture = SponsorReportFixtures::seed();

    $response = $this->actingAs($fixture->user)->postJson('/api/v1/sponsor-reports', ['campaign_id' => $fixture->campaign->id])
        ->assertCreated()
        ->assertJsonPath('data.message', 'Sponsor report created.')
        ->assertJsonPath('data.report.title', 'Spring launch')
        ->assertJsonPath('data.report.campaign', $fixture->campaign->id)
        ->assertJsonPath('data.report.project', $fixture->project->id)
        ->assertJsonPath('data.report.campaignTitle', 'Spring launch')
        ->assertJsonPath('data.report.status', 'active')
        ->assertJsonPath('data.report.viewCount', 0)
        ->assertJsonPath('data.report.expiresAt', null)
        ->assertJsonPath('data.report.sections', [
            'headline' => true, 'trafficQuality' => true, 'geo' => true, 'decay' => true,
            'dealValue' => false, 'links' => true, 'audience' => true,
        ])
        ->assertJsonMissingPath('data.report.tokenHash');

    $id = $response->json('data.report._id');
    $token = $response->json('data.report.token');
    expect($token)->toMatch('/^[A-Za-z0-9]{43}$/');
    expect($response->json('data.report.shareUrl'))->toBe('https://app.example/r/'.$token);

    $stored = storedReport($id);
    expect($stored['tokenHash'])->toBe(hash('sha256', $token));
    expect($stored)->not->toHaveKey('token');
    expect(json_encode($stored))->not->toContain($token);
    expect($stored['owner'])->toBeInstanceOf(ObjectId::class);
    expect($stored['project'])->toBeInstanceOf(ObjectId::class);
    expect($stored['campaign'])->toBeInstanceOf(ObjectId::class);
    expect($stored['createdAt'])->toBeInstanceOf(UTCDateTime::class);

    $this->getJson("/api/v1/sponsor-reports/{$id}")->assertOk()
        ->assertJsonPath('data.report._id', $id)
        ->assertJsonMissingPath('data.report.token')
        ->assertJsonMissingPath('data.report.shareUrl')
        ->assertJsonMissingPath('data.report.tokenHash')
        ->assertJsonMissingPath('data.payload');
    $this->getJson('/api/v1/sponsor-reports')->assertOk()
        ->assertJsonMissingPath('data.reports.0.token')
        ->assertJsonMissingPath('data.reports.0.tokenHash');
});

it('accepts a custom title, section overrides and an expiry on create', function () {
    $fixture = SponsorReportFixtures::seed();
    $expiresAt = now()->addWeek()->startOfSecond();

    $this->actingAs($fixture->user)->postJson('/api/v1/sponsor-reports', [
        'campaign_id' => $fixture->campaign->id,
        'title' => 'Q2 results for Acme',
        'sections' => ['dealValue' => true, 'geo' => false],
        'expires_at' => $expiresAt->toISOString(),
    ])->assertCreated()
        ->assertJsonPath('data.report.title', 'Q2 results for Acme')
        ->assertJsonPath('data.report.sections.dealValue', true)
        ->assertJsonPath('data.report.sections.geo', false)
        ->assertJsonPath('data.report.sections.headline', true)
        ->assertJsonPath('data.report.expiresAt', $expiresAt->utc()->format('Y-m-d\TH:i:s.v\Z'));

    expect(SponsorReport::first()->expiresAt->equalTo($expiresAt))->toBeTrue();
});

it('validates the create payload', function (array $body, string $field) {
    $fixture = SponsorReportFixtures::seed();
    $body = array_map(fn ($value) => $value === 'CAMPAIGN' ? $fixture->campaign->id : $value, $body);

    $this->actingAs($fixture->user)->postJson('/api/v1/sponsor-reports', $body)
        ->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'missing campaign' => [[], 'campaign_id'],
    'malformed campaign' => [['campaign_id' => 'nope'], 'campaign_id'],
    'unknown section' => [['campaign_id' => 'CAMPAIGN', 'sections' => ['secretSauce' => true]], 'sections'],
    'non-boolean section' => [['campaign_id' => 'CAMPAIGN', 'sections' => ['geo' => 'maybe']], 'sections.geo'],
    'sections not a map' => [['campaign_id' => 'CAMPAIGN', 'sections' => 'all'], 'sections'],
    'past expiry' => [['campaign_id' => 'CAMPAIGN', 'expires_at' => '2001-01-01T00:00:00Z'], 'expires_at'],
    'bad expiry' => [['campaign_id' => 'CAMPAIGN', 'expires_at' => 'tomorrow-ish'], 'expires_at'],
    'long title' => [['campaign_id' => 'CAMPAIGN', 'title' => str_repeat('a', 121)], 'title'],
]);

it('returns 404 when the campaign is missing or belongs to someone else', function () {
    $fixture = SponsorReportFixtures::seed();
    $stranger = User::factory()->create();

    $this->actingAs($stranger)->postJson('/api/v1/sponsor-reports', ['campaign_id' => $fixture->campaign->id])
        ->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->postJson('/api/v1/sponsor-reports', ['campaign_id' => (string) new ObjectId])->assertNotFound();
    expect(SponsorReport::count())->toBe(0);
});

it('lists only the user\'s reports, newest first, with an optional campaign filter', function () {
    $this->freezeTime();
    $fixture = SponsorReportFixtures::seed();
    $other = Campaign::factory()->create(['project' => $fixture->project->id, 'title' => 'Fall promo']);
    $old = $fixture->report('a'.str_repeat('1', 42), ['createdAt' => now()->subDay()]);
    $new = SponsorReport::factory()->create(['campaign' => $other->id]);
    SponsorReport::factory()->create();

    $this->actingAs($fixture->user)->getJson('/api/v1/sponsor-reports')->assertOk()
        ->assertJsonPath('data.message', '2 sponsor reports found.')
        ->assertJsonCount(2, 'data.reports')
        ->assertJsonPath('data.reports.0._id', $new->id)
        ->assertJsonPath('data.reports.0.campaignTitle', 'Fall promo')
        ->assertJsonPath('data.reports.1._id', $old->id);

    $this->getJson('/api/v1/sponsor-reports?campaign_id='.$fixture->campaign->id)->assertOk()
        ->assertJsonCount(1, 'data.reports')->assertJsonPath('data.reports.0._id', $old->id);
    $this->getJson('/api/v1/sponsor-reports?campaign_id=bad')->assertStatus(400);
    $this->actingAs(User::factory()->create())->getJson('/api/v1/sponsor-reports')->assertOk()
        ->assertJsonPath('data.message', '0 sponsor reports found.')->assertJsonCount(0, 'data.reports');
});

it('updates title, merges sections, sets expiry and revokes or restores', function () {
    $fixture = SponsorReportFixtures::seed();
    $report = $fixture->report(str_repeat('b', 43));
    $url = "/api/v1/sponsor-reports/{$report->id}";

    $this->actingAs($fixture->user)->patchJson($url, ['title' => 'Renamed', 'sections' => ['audience' => false]])->assertOk()
        ->assertJsonPath('data.message', 'Sponsor report updated.')
        ->assertJsonPath('data.report.title', 'Renamed')
        ->assertJsonPath('data.report.sections.audience', false)
        ->assertJsonPath('data.report.sections.links', true)
        ->assertJsonMissingPath('data.report.token');

    $this->patchJson($url, ['sections' => ['dealValue' => true]])->assertOk()
        ->assertJsonPath('data.report.sections.audience', false)
        ->assertJsonPath('data.report.sections.dealValue', true);

    $this->patchJson($url, ['expires_at' => now()->addDay()->toISOString()])->assertOk()->assertJsonPath('data.report.status', 'active');
    expect($report->fresh()->expiresAt)->not->toBeNull();
    $this->patchJson($url, ['expires_at' => null])->assertOk()->assertJsonPath('data.report.expiresAt', null);

    $this->patchJson($url, ['revoked' => true])->assertOk()->assertJsonPath('data.report.status', 'revoked');
    expect($report->fresh()->revokedAt)->not->toBeNull();
    $this->patchJson($url, ['revoked' => false])->assertOk()->assertJsonPath('data.report.status', 'active')->assertJsonPath('data.report.revokedAt', null);

    $this->patchJson($url, ['title' => ''])->assertUnprocessable()->assertJsonValidationErrors('title');
    $this->patchJson($url, ['sections' => ['nope' => true]])->assertUnprocessable()->assertJsonValidationErrors('sections');
    $this->patchJson($url, ['expires_at' => now()->subDay()->toISOString()])->assertUnprocessable()->assertJsonValidationErrors('expires_at');
});

it('regenerates the token and invalidates the old one', function () {
    $fixture = SponsorReportFixtures::seed();
    $oldToken = str_repeat('c', 43);
    $report = $fixture->report($oldToken);
    $this->getJson("/api/v1/public/reports/{$oldToken}")->assertOk();

    $response = $this->actingAs($fixture->user)->patchJson("/api/v1/sponsor-reports/{$report->id}", ['regenerate_token' => true])->assertOk()
        ->assertJsonPath('data.message', 'Sponsor report link regenerated.');
    $newToken = $response->json('data.report.token');

    expect($newToken)->toMatch('/^[A-Za-z0-9]{43}$/')->not->toBe($oldToken);
    expect($response->json('data.report.shareUrl'))->toEndWith('/r/'.$newToken);
    expect(storedReport($report->id)['tokenHash'])->toBe(hash('sha256', $newToken));

    $this->getJson("/api/v1/public/reports/{$oldToken}")->assertNotFound();
    $this->getJson("/api/v1/public/reports/{$newToken}")->assertOk();
});

it('deletes a report and its link stops working', function () {
    $fixture = SponsorReportFixtures::seed();
    $token = str_repeat('d', 43);
    $report = $fixture->report($token);

    $this->actingAs($fixture->user)->deleteJson("/api/v1/sponsor-reports/{$report->id}")->assertNoContent();
    expect(SponsorReport::count())->toBe(0);
    $this->getJson("/api/v1/public/reports/{$token}")->assertNotFound();
    $this->deleteJson("/api/v1/sponsor-reports/{$report->id}")->assertNotFound();
});

it('hides other users\' reports behind 404 and rejects malformed ids with 400', function () {
    $fixture = SponsorReportFixtures::seed();
    $report = $fixture->report(str_repeat('e', 43));
    $url = "/api/v1/sponsor-reports/{$report->id}";

    $this->actingAs(User::factory()->create());
    $this->getJson($url)->assertNotFound()->assertJsonPath('message', 'Sponsor report not found.');
    $this->patchJson($url, ['title' => 'Mine now'])->assertNotFound();
    $this->deleteJson($url)->assertNotFound();
    expect($report->fresh()->title)->not->toBe('Mine now');

    $this->getJson('/api/v1/sponsor-reports/not-an-id')->assertStatus(400);
    $this->getJson('/api/v1/sponsor-reports/'.new ObjectId)->assertNotFound();
});

it('requires an onboarded, signed-in user for owner routes', function () {
    $this->getJson('/api/v1/sponsor-reports')->assertUnauthorized();
    $this->postJson('/api/v1/sponsor-reports', [])->assertUnauthorized();

    $this->actingAs(User::factory()->withoutUsername()->create())->getJson('/api/v1/sponsor-reports')->assertForbidden();
});

it('previews the public payload for the owner without exposing the token', function () {
    $fixture = SponsorReportFixtures::seed();
    $report = $fixture->report(str_repeat('f', 43));

    $this->actingAs($fixture->user)->getJson("/api/v1/sponsor-reports/{$report->id}?preview=1")->assertOk()
        ->assertJsonPath('data.payload.campaign.title', 'Spring launch')
        ->assertJsonPath('data.payload.headline.stats.0.key', 'verifiedHumanClicks')
        ->assertJsonMissingPath('data.report.token');
    expect($report->fresh()->viewCount)->toBe(0);
});
