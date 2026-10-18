<?php

use App\Models\Click;
use App\Models\Link;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

it('redirects active links and records private network data and parsed UA fields', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-19T12:05:00Z'));
    $link = Link::factory()->create(['slug' => 'abcd']);
    $this->withHeaders([
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer' => 'https://example.com/source',
        'X-Forwarded-For' => '203.0.113.42, 127.0.0.1',
    ])->get('/ABCD')->assertRedirect($link->destinationUrl)->assertCookieMissing('rat_vid');

    expect($link->refresh()->clickCount)->toBe(1);
    $click = Click::sole();
    expect($click->device['type'])->toBe('desktop');
    expect($click->os['name'])->toBe('Windows');
    expect($click->browser['name'])->toBe('Chrome');
    expect($click->browser['major'])->toBe('120');
    expect($click->fullDateClicked)->toBe('Saturday, September 19th 2026, at 12:05 PM');
    expect($click->dayOfWeek)->toBe(6);
    expect($click->hourOfDay)->toBe(12);
    expect($click->geo)->toBeNull();
    expect($click->referrer)->toBe('https://example.com/source');
    expect($click->isBot)->toBeFalse();
    expect($click->toArray())->not->toHaveKeys(['ip', 'visitorId', 'visitorVersion']);
    $raw = DB::connection('mongodb')->getCollection('clicks')->findOne([]);
    expect($raw['ip'])->toBe('203.0.113.42');
    expect($raw['clickedAt'])->toBeInstanceOf(UTCDateTime::class);
    foreach (['link', 'campaign', 'project'] as $key) {
        expect($raw[$key])->toBeInstanceOf(ObjectId::class);
    }
    expect(isset($raw['visitorId']))->toBeFalse();
});

it('sets a signed host-only visitor cookie and reuses the project-scoped identity', function () {
    config(['rat.visitor.enabled' => true, 'rat.visitor.secret' => str_repeat('s', 64)]);
    $link = Link::factory()->create();
    $first = $this->get('/'.$link->slug)->assertRedirect($link->destinationUrl)->assertPlainCookie('rat_vid');
    $cookie = collect($first->headers->getCookies())->first(fn ($cookie) => $cookie->getName() === 'rat_vid');
    expect($cookie->isHttpOnly())->toBeTrue();
    expect($cookie->getDomain())->toBeNull();
    expect($cookie->getPath())->toBe('/');
    expect($cookie->getSameSite())->toBe('lax');
    expect($cookie->getValue())->toMatch('/^v1\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/');
    $raw = DB::connection('mongodb')->getCollection('clicks')->findOne([]);
    $firstId = $raw['visitorId'];
    expect($firstId)->toMatch('/^[a-f0-9]{64}$/');
    expect($raw['visitorVersion'])->toBe(1);
    $token = explode('.', $cookie->getValue())[1];
    expect($firstId)->toBe(hash_hmac('sha256', 'rat-visitor-id-v1|v1|'.$link->project.'|'.$token, str_repeat('s', 64)));

    $this->withUnencryptedCookie('rat_vid', $cookie->getValue())->withHeader('X-Forwarded-For', '203.0.113.99')->get('/'.$link->slug)
        ->assertRedirect($link->destinationUrl)->assertCookieMissing('rat_vid');
    $rows = DB::connection('mongodb')->getCollection('clicks')->find([])->toArray();
    expect($rows)->toHaveCount(2);
    expect($rows[1]['visitorId'])->toBe($firstId);
    $other = Link::factory()->create();
    $this->get('/'.$other->slug)->assertRedirect($other->destinationUrl)->assertCookieMissing('rat_vid');
    $otherRaw = DB::connection('mongodb')->getCollection('clicks')->findOne(['link' => new ObjectId($other->id)]);
    expect($otherRaw['visitorId'])->not->toBe($firstId);
});

it('replaces tampered cookies and degrades cleanly without a usable secret', function (mixed $cookie) {
    config(['rat.visitor.enabled' => true, 'rat.visitor.secret' => str_repeat('s', 64)]);
    $link = Link::factory()->create();
    $this->withUnencryptedCookie('rat_vid', $cookie)->get('/'.$link->slug)
        ->assertRedirect($link->destinationUrl)->assertPlainCookie('rat_vid');
    expect(Click::count())->toBe(1);
    config(['rat.visitor.secret' => 'short']);
    $this->get('/'.$link->slug)->assertRedirect($link->destinationUrl)->assertCookieMissing('rat_vid');
    expect(Click::count())->toBe(2);
    $raw = DB::connection('mongodb')->getCollection('clicks')->find(['visitorId' => ['$exists' => false]])->toArray();
    expect($raw)->toHaveCount(1);
})->with(['v1.tampered.invalid', 'v2.'.str_repeat('a', 43).'.invalid', str_repeat('x', 513), '']);

it('redirects inactive and missing links to the frontend without recording or issuing identity cookies', function () {
    config(['rat.visitor.enabled' => true, 'rat.visitor.secret' => str_repeat('s', 64)]);
    $link = Link::factory()->create(['isActive' => false]);

    $this->get('/'.$link->slug)->assertRedirect(config('rat.frontend_url'))->assertCookieMissing('rat_vid');
    $this->get('/nonexistent')->assertRedirect(config('rat.frontend_url'))->assertCookieMissing('rat_vid');
    expect(Click::count())->toBe(0);
    expect($link->refresh()->clickCount)->toBe(0);
});

it('uses the legacy bot expression and maps mobile devices into the existing enum', function () {
    $link = Link::factory()->create();
    $this->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
        ->get('/'.$link->slug)->assertRedirect($link->destinationUrl);
    expect(Click::sole()->isBot)->toBeTrue();
    $this->withHeader('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        ->get('/'.$link->slug)->assertRedirect($link->destinationUrl);
    $mobile = Click::where('isBot', false)->sole();
    expect($mobile->device['type'])->toBe('mobile');
    expect($mobile->device['vendor'])->toBe('Apple');
    expect($mobile->os['name'])->toBe('iOS');
});

it('keeps redirects working when click persistence fails', function () {
    Log::spy();
    $link = Link::factory()->create();
    Click::creating(fn () => throw new RuntimeException('Simulated tracking failure'));
    try {
        $this->get('/'.$link->slug)->assertRedirect($link->destinationUrl);
        expect($link->refresh()->clickCount)->toBe(1);
        expect(Click::count())->toBe(0);
        Log::shouldHaveReceived('warning')->once()->with('Short-link click tracking failed.', ['exception' => RuntimeException::class]);
    } finally {
        Click::flushEventListeners();
    }
});

it('keeps reserved prefixes and health routes out of short-link resolution', function () {
    Link::factory()->create(['slug' => 'api']);
    Link::factory()->create(['slug' => 'sanctum']);
    Link::factory()->create(['slug' => 'up']);

    $this->get('/up')->assertOk();
    $this->get('/api')->assertNotFound();
    $this->get('/sanctum')->assertNotFound();
    $this->getJson('/api/v1/me')->assertUnauthorized();
    $this->get('/sanctum/csrf-cookie')->assertNoContent();
    expect(Click::count())->toBe(0);
});

it('derives local click time fields from the configured click timezone and stores clickedAt in UTC', function () {
    config(['rat.click_timezone' => 'America/New_York']);
    $this->travelTo(CarbonImmutable::parse('2026-09-20T04:35:00Z'));
    $link = Link::factory()->create();

    $this->get('/'.$link->slug)->assertRedirect($link->destinationUrl);

    $raw = DB::connection('mongodb')->getCollection('clicks')->findOne([]);
    expect($raw['clickedAt']->toDateTime()->format(DATE_ATOM))->toBe('2026-09-20T04:35:00+00:00');
    expect($raw['hourOfDay'])->toBe(0);
    expect($raw['dayOfWeek'])->toBe(0);
    expect($raw['fullDateClicked'])->toBe('Sunday, September 20th 2026, at 12:35 AM');
});
