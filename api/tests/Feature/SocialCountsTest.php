<?php

use App\Models\User;
use App\Services\SocialCounts;
use Illuminate\Http\Client\Events\ConnectionFailed;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

function publicYouTubePage(string $count = '2.28M subscribers'): string
{
    return '<script>var ytInitialData = '.json_encode(['header' => ['c4TabbedHeaderRenderer' => ['title' => 'Creator channel', 'subscriberCountText' => ['simpleText' => $count]]]]).';</script>';
}

function publicInstagramPage(string $count = '1.2M', string $name = 'creator'): string
{
    return '<meta property="og:url" content="https://www.instagram.com/'.$name.'/"><meta property="og:description" content="'.$count.' Followers, 12 Following, 4 Posts">';
}

it('advances username onboarding to socials and completes with normalized profiles', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://www.youtube.com/@creator?hl=en' => Http::response(publicYouTubePage()),
        'https://www.instagram.com/creator/' => Http::response(publicInstagramPage()),
    ]);
    $user = User::factory()->withoutUsername()->create();
    $this->actingAs($user)->putJson('/api/v1/me/username', ['username' => 'new_creator'])
        ->assertOk()->assertJsonPath('data.onboarding_step', 'socials');
    expect($user->refresh()->getAttributes()['onboardingStep'])->toBe('socials');
    $this->getJson('/api/v1/projects')->assertForbidden();

    $this->putJson('/api/v1/onboarding/socials', ['youtube' => ' @creator ', 'instagram' => '@creator', 'twitch' => 'creator'])
        ->assertOk()->assertJsonPath('data.onboarding_step', 'complete')
        ->assertJsonPath('data.socials.youtube.identifier', 'creator')
        ->assertJsonPath('data.socials.youtube.count', 2280000)
        ->assertJsonPath('data.socials.youtube.approximate', true)
        ->assertJsonPath('data.socials.instagram.count', 1200000)
        ->assertJsonPath('data.socials.twitch.count', null)
        ->assertJsonPath('data.socials.twitch.lastError', 'Automatic Twitch counts are not connected in this installation.')
        ->assertJsonMissingPath('data.user')->assertJsonMissingPath('data.counts')->assertJsonMissingPath('data.next');
    $raw = DB::connection('mongodb')->getCollection('users')->findOne(['_id' => new ObjectId($user->id)]);
    expect($raw['socials']['youtube']['syncedAt'])->toBeInstanceOf(UTCDateTime::class);
    expect($raw['socialsLastAttemptedAt'])->toBeInstanceOf(UTCDateTime::class);
    expect($raw['onboardingStep'])->toBe('complete');
    Http::assertSentCount(2);
});

it('requires authentication and a username before saving socials', function () {
    $this->putJson('/api/v1/onboarding/socials', [])->assertUnauthorized();
    $this->actingAs(User::factory()->withoutUsername()->create())
        ->putJson('/api/v1/onboarding/socials', ['youtube' => 'creator', 'instagram' => 'creator'])->assertForbidden();
});

it('rejects missing required profiles and identifiers that could change the public URL', function (array $payload, string $field) {
    Http::preventStrayRequests();
    $user = User::factory()->create(['onboardingStep' => 'socials']);

    $this->actingAs($user)->putJson('/api/v1/onboarding/socials', ['youtube' => 'creator', 'instagram' => 'creator', ...$payload])
        ->assertBadRequest()->assertJsonValidationErrors($field);
    expect($user->refresh()->getAttributes()['onboardingStep'])->toBe('socials');
    Http::assertNothingSent();
})->with([
    'missing youtube' => [['youtube' => ''], 'youtube'],
    'missing instagram' => [['instagram' => ''], 'instagram'],
    'path injection' => [['twitter' => '../admin'], 'twitter'],
    'host injection' => [['youtube' => 'https://localhost/'], 'youtube'],
    'query injection' => [['instagram' => 'creator?x=1'], 'instagram'],
    'explicit null' => [['twitch' => null], 'twitch'],
    'non-string' => [['twitch' => 12], 'twitch'],
    'too long' => [['youtube' => str_repeat('a', 101)], 'youtube'],
]);

it('refreshes stale profiles and uses the configured interval before refreshing again', function () {
    $this->freezeTime();
    config(['rat.social_refresh_minutes' => 10]);
    Http::preventStrayRequests();
    Http::fake(['https://www.youtube.com/@creator?hl=en' => Http::response(publicYouTubePage('0 subscribers'))]);
    $user = User::factory()->create(['socials' => ['youtube' => ['identifier' => 'creator']]]);

    $this->actingAs($user)->getJson('/api/v1/socials/counts')->assertOk()
        ->assertJsonPath('data.profiles.0.platform', 'youtube')
        ->assertJsonPath('data.profiles.0.count', 0)
        ->assertJsonPath('data.refresh.0.status', 'ok');
    $this->getJson('/api/v1/socials/counts')->assertOk()->assertJsonPath('data.refresh', []);
    Http::assertSentCount(1);
    $this->travel(10)->minutes();
    $this->getJson('/api/v1/socials/counts')->assertOk()->assertJsonPath('data.refresh.0.status', 'ok');
    Http::assertSentCount(2);
});

it('preserves last good counts and sync dates on a failed refresh and returns 502', function () {
    $this->freezeTime();
    Http::preventStrayRequests();
    Http::fake(['https://www.instagram.com/creator/' => Http::response('', 429)]);
    $synced = new UTCDateTime(now()->subDay());
    $user = User::factory()->create(['socials' => ['instagram' => [
        'identifier' => 'creator', 'count' => 23, 'displayName' => 'Saved', 'syncedAt' => $synced, 'approximate' => true,
    ]]]);

    $this->actingAs($user)->postJson('/api/v1/socials/refresh')->assertStatus(502)
        ->assertJsonPath('data.profiles.0.count', 23)
        ->assertJsonPath('data.profiles.0.syncedAt', now()->subDay()->format('Y-m-d\TH:i:s.v\Z'))
        ->assertJsonPath('data.results.0.status', 'error')
        ->assertJsonPath('data.results.0.error', 'Instagram rate limit reached. Try again later.');
    expect($user->refresh()->socialProfiles()['instagram']['count'])->toBe(23);
    expect(app(SocialCounts::class)->stale($user))->toBeFalse();
    Http::assertSentCount(1);
    $this->getJson('/api/v1/socials/counts')->assertOk()->assertJsonPath('data.refresh', []);
    Http::assertSentCount(1);
});

it('returns 200 for mixed refresh results and for unsupported-only profiles', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://www.youtube.com/@creator?hl=en' => Http::response(publicYouTubePage('1 subscriber')),
        'https://www.instagram.com/creator/' => Http::response('', 404),
    ]);
    $user = User::factory()->create(['socials' => ['youtube' => ['identifier' => 'creator'], 'instagram' => ['identifier' => 'creator']]]);
    $this->actingAs($user)->postJson('/api/v1/socials/refresh')->assertOk()
        ->assertJsonPath('data.results.0.status', 'ok')->assertJsonPath('data.results.1.status', 'error');
    $other = User::factory()->create(['socials' => ['twitch' => ['identifier' => 'creator']]]);
    $this->actingAs($other)->postJson('/api/v1/socials/refresh')->assertOk()->assertJsonPath('data.results.0.status', 'unsupported');
    Http::assertSentCount(2);
});

it('keeps unchanged profiles on failed onboarding fetches and resets changed profiles', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://www.youtube.com/@creator?hl=en' => Http::response('', 403),
        'https://www.youtube.com/@different?hl=en' => Http::response('', 403),
        'https://www.instagram.com/creator/' => Http::response('', 403),
    ]);
    $user = User::factory()->create(['socials' => [
        'youtube' => ['identifier' => 'creator', 'count' => 23], 'instagram' => ['identifier' => 'creator', 'count' => 23],
    ]]);
    $this->actingAs($user)->putJson('/api/v1/onboarding/socials', ['youtube' => '@creator', 'instagram' => 'creator'])
        ->assertOk()->assertJsonPath('data.socials.youtube.count', 23)->assertJsonPath('data.onboarding_step', 'complete');
    $this->putJson('/api/v1/onboarding/socials', ['youtube' => 'different', 'instagram' => 'creator'])
        ->assertOk()->assertJsonPath('data.socials.youtube.count', null)->assertJsonPath('data.socials.instagram.count', 23);
    Http::assertSentCount(4);
});

it('does not follow provider redirects or expose provider failures as application errors', function () {
    Http::preventStrayRequests();
    Http::fake(['https://x.com/creator' => Http::response('', 302, ['Location' => 'https://localhost/private'])]);
    $user = User::factory()->create(['socials' => ['twitter' => ['identifier' => 'creator']]]);

    $this->actingAs($user)->postJson('/api/v1/socials/refresh')->assertStatus(502)
        ->assertJsonPath('data.results.0.error', 'Twitter / X did not allow the public profile to be read.');
    Http::assertSentCount(1);
});

it('clears optional profiles only when supplied and leaves omitted profiles unchanged', function () {
    Http::preventStrayRequests();
    Http::fake([
        'https://www.youtube.com/@creator?hl=en' => Http::response(publicYouTubePage()),
        'https://www.instagram.com/creator/' => Http::response(publicInstagramPage()),
    ]);
    $user = User::factory()->create(['socials' => [
        'youtube' => ['identifier' => 'creator'], 'instagram' => ['identifier' => 'creator'],
        'twitter' => ['identifier' => 'old_creator', 'count' => 8], 'twitch' => ['identifier' => 'old_creator', 'count' => 12],
    ]]);

    $this->actingAs($user)->putJson('/api/v1/onboarding/socials', ['youtube' => 'creator', 'instagram' => 'creator', 'twitter' => ''])
        ->assertOk()->assertJsonPath('data.socials.twitter.identifier', '')->assertJsonPath('data.socials.twitter.count', null)
        ->assertJsonPath('data.socials.twitch.identifier', 'old_creator')->assertJsonPath('data.socials.twitch.count', 12);
    Http::assertSentCount(2);
});

it('reports provider connection failures while retaining cached counts', function () {
    Http::preventStrayRequests();
    Http::fake(['https://x.com/creator' => Http::failedConnection()]);
    // Pooled requests that fail to connect dispatch ConnectionFailed but are not recorded as sent.
    $attempts = [];
    Event::listen(ConnectionFailed::class, function (ConnectionFailed $event) use (&$attempts): void {
        $attempts[] = $event->request->url();
    });
    $user = User::factory()->create(['socials' => ['twitter' => ['identifier' => 'creator', 'count' => 42]]]);

    $this->actingAs($user)->postJson('/api/v1/socials/refresh')->assertStatus(502)
        ->assertJsonPath('data.profiles.0.count', 42)
        ->assertJsonPath('data.results.0.error', 'Could not read the Twitter / X public count. Try again later.');
    expect($attempts)->toBe(['https://x.com/creator']);
});
