<?php

use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Port of the old overview integration suite: window totals, bots, visitors, rankings,
| trends, scopes and ownership for GET /analytics/overview.
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-17T12:00:00Z'));

    $fixtures = $this->fixtures = new AnalyticsFixtures;
    $this->owner = $fixtures->user();
    $otherOwner = $fixtures->user();

    $own = $fixtures->project($this->owner, ['clientName' => 'Alpha']);
    $second = $fixtures->project($this->owner, ['clientName' => 'Empty']);
    $foreign = $fixtures->project($otherOwner, ['clientName' => 'Other account']);
    $campaign = $fixtures->campaign($own, ['title' => 'Launch']);
    $otherCampaign = $fixtures->campaign($foreign, ['title' => 'Private campaign']);
    $link = $fixtures->link($own, $campaign, 'youtube');
    $secondLink = $fixtures->link($own, $campaign, 'other', ['isActive' => false]);
    $foreignLink = $fixtures->link($foreign, $otherCampaign, 'twitter');

    $click = fn (ObjectId $project, ObjectId $campaign, ObjectId $link, float $hours, array $extra = [], array $unset = []) => $fixtures->click(
        $project, $campaign, $link, ['clickedAt' => AnalyticsFixtures::hoursAgo($hours), ...$extra], $unset,
    );

    $click($own, $campaign, $link, 1, ['visitorId' => 'repeat', 'ip' => '192.0.2.1', 'referrer' => 'https://t.co/x']);
    $click($own, $campaign, $link, 2, ['visitorId' => 'repeat']);
    $click($own, $campaign, $secondLink, 3, ['geo' => ['country' => 'GB'], 'device' => ['type' => 'mobile']]);
    $click($own, $campaign, $link, 4, ['isBot' => true, 'visitorId' => 'bot']);
    $click($own, $campaign, $link, 30, ['visitorId' => 'previous']);
    $click($own, $campaign, $link, 180);
    $click($own, $campaign, $link, 800);
    $click($own, $campaign, $link, 1500);
    $click($own, $campaign, $link, -10);
    $click($foreign, $otherCampaign, $foreignLink, 1, ['visitorId' => 'private']);
    $click($own, $campaign, $link, 5, unset: ['isBot', 'geo', 'browser']);

    $this->ids = (object) compact('own', 'second', 'foreign', 'campaign', 'otherCampaign', 'link', 'secondLink', 'foreignLink');

    Sanctum::actingAs($this->owner);
});

afterEach(function () {
    $this->fixtures->cleanup();
});

function overview(object $test, array $query = []): TestResponse
{
    return $test->getJson('/api/v1/analytics/overview'.($query === [] ? '' : '?'.http_build_query($query)));
}

test('period totals, bots, visitors, rankings and trends stay consistent', function (string $window, int $total, int $visitors, int $identifiedClicks) {
    $data = overview($this, ['window' => $window])->assertOk()->json('data');

    expect($data['window'])->toBe($window)
        ->and($data['summary'])->toBe([
            'clicks' => $total,
            'previousClicks' => 1,
            'botClicks' => 1,
            'visitors' => $visitors,
            'returningVisitors' => 1,
            'identifiedClicks' => $identifiedClicks,
            'projects' => 2,
            'campaigns' => 1,
            'links' => 2,
            'activeLinks' => 1,
        ])
        ->and($data['trend'])->toHaveCount(12)
        ->and(array_sum(array_column($data['trend'], 'botCount')))->toBe(1)
        ->and(collect($data['projects'])->firstWhere('name', 'Empty')['count'])->toBe(0)
        ->and($data['recent'])->toHaveCount($total)
        ->and(collect($data['recent'])->every(fn (array $row): bool => $row['campaignTitle'] === 'Launch'))->toBeTrue();

    foreach (['trend', 'projects', 'campaigns', 'platforms', 'heatmap'] as $key) {
        expect(array_sum(array_column($data[$key], 'count')))->toBe($total, $key);
    }

    $json = json_encode($data);
    foreach (['visitorId', 'visitorVersion', '192.0.2.1', 'Private campaign', 'Other account'] as $secret) {
        expect($json)->not->toContain($secret);
    }
})->with([
    '24h' => ['24h', 4, 1, 2],
    '7d' => ['7d', 5, 2, 3],
    '30d' => ['30d', 6, 2, 3],
]);

test('the window defaults to 30 days', function () {
    expect(overview($this)->assertOk()->json('data.window'))->toBe('30d');
});

test('the response matches the old body shape', function () {
    $data = overview($this, ['window' => '24h'])->assertOk()->json('data');

    expect(array_keys($data))->toBe([
        'window', 'start', 'end', 'summary', 'trend', 'countries', 'devices', 'browsers', 'sources',
        'platforms', 'projects', 'campaigns', 'heatmap', 'recent',
    ])
        ->and($data['start'])->toBe('2026-10-16T12:00:00.000Z')
        ->and($data['end'])->toBe('2026-10-17T12:00:00.000Z')
        ->and($data['trend'][0])->toBe(['date' => '2026-10-16T12:00:00.000Z', 'count' => 0, 'botCount' => 0])
        ->and($data['trend'][11])->toBe(['date' => '2026-10-17T10:00:00.000Z', 'count' => 2, 'botCount' => 0])
        ->and($data['trend'][10])->toBe(['date' => '2026-10-17T08:00:00.000Z', 'count' => 1, 'botCount' => 1])
        ->and($data['countries'])->toBe([['name' => 'US', 'count' => 2], ['name' => 'GB', 'count' => 1], ['name' => 'Unknown', 'count' => 1]])
        ->and($data['devices'])->toBe([['name' => 'desktop', 'count' => 3], ['name' => 'mobile', 'count' => 1]])
        ->and($data['browsers'])->toBe([['name' => 'Chrome', 'count' => 3], ['name' => 'Unknown', 'count' => 1]])
        ->and($data['sources'])->toBe([['name' => 'Direct / unknown', 'count' => 3], ['name' => 'https://t.co/x', 'count' => 1]])
        ->and($data['platforms'])->toBe([['name' => 'youtube', 'count' => 3], ['name' => 'other', 'count' => 1]])
        ->and($data['projects'])->toBe([
            ['id' => (string) $this->ids->own, 'name' => 'Alpha', 'count' => 4],
            ['id' => (string) $this->ids->second, 'name' => 'Empty', 'count' => 0],
        ])
        ->and($data['campaigns'])->toBe([['id' => (string) $this->ids->campaign, 'name' => 'Launch', 'count' => 4]]);

    $recent = collect($data['recent'])->keyBy(fn (array $row): string => $row['clickedAt']);

    expect($recent['2026-10-17T11:00:00.000Z'])->toEqual([
        '_id' => $recent['2026-10-17T11:00:00.000Z']['_id'],
        'campaign' => (string) $this->ids->campaign,
        'clickedAt' => '2026-10-17T11:00:00.000Z',
        'country' => 'US',
        'device' => 'desktop',
        'browser' => 'Chrome',
        'campaignTitle' => 'Launch',
    ])
        ->and($recent['2026-10-17T07:00:00.000Z'])->not->toHaveKeys(['country', 'browser'])
        ->and(array_column($data['recent'], 'clickedAt'))->toBe([
            '2026-10-17T11:00:00.000Z', '2026-10-17T10:00:00.000Z', '2026-10-17T09:00:00.000Z', '2026-10-17T07:00:00.000Z',
        ]);
});

test('the heatmap buckets by UTC day and hour regardless of the app timezone', function () {
    config(['app.timezone' => 'America/Los_Angeles']);
    date_default_timezone_set('America/Los_Angeles');

    try {
        $heatmap = collect(overview($this, ['window' => '24h'])->assertOk()->json('data.heatmap'))
            ->sortBy('hour')->values()->all();
    } finally {
        date_default_timezone_set('UTC');
    }

    // 2026-10-17 is a Saturday: MongoDB $dayOfWeek 7, reported as day 6.
    expect($heatmap)->toBe([
        ['day' => 6, 'hour' => 7, 'count' => 1],
        ['day' => 6, 'hour' => 9, 'count' => 1],
        ['day' => 6, 'hour' => 10, 'count' => 1],
        ['day' => 6, 'hour' => 11, 'count' => 1],
    ]);
});

test('scopes resolve inventory for a single link', function () {
    $summary = overview($this, ['window' => '24h', 'linkId' => (string) $this->ids->link])->assertOk()->json('data.summary');

    expect($summary)->toMatchArray(['clicks' => 3, 'projects' => 1, 'campaigns' => 1, 'links' => 1, 'activeLinks' => 1]);
});

test('a campaign scope narrows projects and links', function () {
    $summary = overview($this, ['window' => '24h', 'campaignId' => (string) $this->ids->campaign])->assertOk()->json('data.summary');

    expect($summary)->toMatchArray(['clicks' => 4, 'projects' => 1, 'campaigns' => 1, 'links' => 2]);
});

test('inaccessible or mismatched parents return 404', function (Closure $query, string $message) {
    overview($this, $query($this->ids))->assertNotFound()->assertExactJson(['message' => $message]);
})->with([
    'foreign project' => [fn (object $ids) => ['projectId' => (string) $ids->foreign], 'Project not found.'],
    'foreign campaign' => [fn (object $ids) => ['campaignId' => (string) $ids->otherCampaign], 'Campaign not found.'],
    'foreign link' => [fn (object $ids) => ['linkId' => (string) $ids->foreignLink], 'Link not found.'],
    'campaign outside project' => [fn (object $ids) => ['projectId' => (string) $ids->second, 'campaignId' => (string) $ids->campaign], 'Campaign not found.'],
    'link outside project' => [fn (object $ids) => ['projectId' => (string) $ids->second, 'linkId' => (string) $ids->link], 'Link not found.'],
]);

test('invalid windows and IDs return 400', function (array $query) {
    overview($this, $query)
        ->assertStatus(400)
        ->assertExactJson(['message' => 'Use valid IDs and a window of 24h, 7d, or 30d.']);
})->with([
    'unknown window' => [['window' => 'all']],
    'empty window' => [['window' => '']],
    'array window' => [['window' => ['24h']]],
    'bad project' => [['projectId' => 'bad']],
    'operator campaign' => [['campaignId' => ['$ne' => '']]],
    'bad link' => [['linkId' => 'bad']],
    'empty link' => [['linkId' => '']],
]);

test('an empty project scope reports zeros', function () {
    $data = overview($this, ['projectId' => (string) $this->ids->second])->assertOk()->json('data');

    expect($data['summary'])->toMatchArray(['clicks' => 0, 'visitors' => 0, 'projects' => 1, 'campaigns' => 0, 'links' => 0])
        ->and($data['recent'])->toBe([])
        ->and(array_sum(array_column($data['trend'], 'count')))->toBe(0)
        ->and(array_sum(array_column($data['trend'], 'botCount')))->toBe(0);
});

test('bot trend buckets respect window boundaries and exclude other scopes', function (string $scope) {
    foreach ([24, 22, 25, 0, -1] as $hours) {
        $this->fixtures->click($this->ids->own, $this->ids->campaign, $this->ids->link, [
            'clickedAt' => AnalyticsFixtures::hoursAgo($hours), 'isBot' => true,
        ]);
    }
    $this->fixtures->click($this->ids->foreign, $this->ids->otherCampaign, $this->ids->foreignLink, [
        'clickedAt' => AnalyticsFixtures::hoursAgo(22), 'isBot' => true,
    ]);

    $id = match ($scope) {
        'projectId' => $this->ids->own,
        'campaignId' => $this->ids->campaign,
        'linkId' => $this->ids->link,
    };
    $data = overview($this, ['window' => '24h', $scope => (string) $id])->assertOk()->json('data');

    expect($data['trend'][0])->toBe(['date' => '2026-10-16T12:00:00.000Z', 'count' => 0, 'botCount' => 1])
        ->and($data['trend'][1])->toBe(['date' => '2026-10-16T14:00:00.000Z', 'count' => 0, 'botCount' => 1])
        ->and(array_sum(array_column($data['trend'], 'botCount')))->toBe(3)
        ->and($data['summary']['botClicks'])->toBe(3);

    $otherLink = overview($this, ['window' => '24h', 'linkId' => (string) $this->ids->secondLink])->assertOk()->json('data');
    expect(array_sum(array_column($otherLink['trend'], 'botCount')))->toBe(0);
})->with(['projectId', 'campaignId', 'linkId']);
