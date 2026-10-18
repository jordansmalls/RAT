<?php

use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Port of the old export behaviour and the A4/A7 export exclusion specs: downloads never contain
| `ip`, `visitorId` or `visitorVersion`, through either format.
*/

beforeEach(function () {
    $fixtures = $this->fixtures = new AnalyticsFixtures;
    $this->owner = $fixtures->user();
    $this->project = $fixtures->project($this->owner);
    $this->campaign = $fixtures->campaign($this->project);
    $this->link = $fixtures->link($this->project, $this->campaign, 'youtube');
    $this->otherLink = $fixtures->link($this->project, $this->campaign, 'tiktok');

    $this->firstClick = $fixtures->click($this->project, $this->campaign, $this->link, [
        'clickedAt' => AnalyticsFixtures::date(1_789_819_200_000),
        'ip' => '203.0.113.9',
        'visitorId' => 'probe-visitor-id',
        'visitorVersion' => 1,
        'geo' => ['country' => 'US', 'city' => 'New "York"', 'll' => ['lat' => 40.7128, 'lon' => -74.006]],
        'referrer' => 'https://example.com/a,b',
    ]);
    $fixtures->click($this->project, $this->campaign, $this->otherLink, [
        'clickedAt' => AnalyticsFixtures::date(1_789_819_260_000),
        'ip' => '203.0.113.10',
        'device' => ['type' => 'mobile', 'vendor' => 'Apple'],
        'isBot' => true,
    ], unset: ['referrer']);

    $otherProject = $fixtures->project($fixtures->user());
    $fixtures->click($otherProject, $fixtures->campaign($otherProject), new ObjectId, ['ip' => '198.51.100.1']);

    Sanctum::actingAs($this->owner);
});

afterEach(function () {
    $this->fixtures->cleanup();
});

function exportFrom(object $test, array $query = []): TestResponse
{
    return $test->get(AnalyticsFixtures::projectUrl($test->project, 'export', $query));
}

test('JSON is the default and downloads the project clicks without private fields', function () {
    $response = exportFrom($this)->assertOk()
        ->assertHeader('Content-Type', 'application/json; charset=utf-8')
        ->assertHeader('Content-Disposition', "attachment; filename=\"clicks-{$this->project}.json\"");
    $content = $response->streamedContent();
    $rows = json_decode($content, true);

    expect($rows)->toHaveCount(2)
        ->and($content)->toStartWith("[\n  {\n    \"_id\": \"{$this->firstClick}\",\n    \"link\": \"{$this->link}\"")
        ->and($content)->toEndWith("\n  }\n]")
        ->and($rows[0])->toMatchArray([
            'project' => (string) $this->project,
            'campaign' => (string) $this->campaign,
            'clickedAt' => '2026-09-19T12:00:00.000Z',
            'geo' => ['country' => 'US', 'city' => 'New "York"', 'll' => ['lat' => 40.7128, 'lon' => -74.006]],
            'referrer' => 'https://example.com/a,b',
            'isBot' => false,
        ])
        ->and($rows[1])->not->toHaveKey('referrer');

    foreach ($rows as $row) {
        expect($row)->not->toHaveKeys(['ip'])
            ->not->toHaveKey('visitorId')
            ->not->toHaveKey('visitorVersion');
    }

    expect($content)->not->toContain('probe-visitor-id')
        ->not->toContain('203.0.113.')
        ->not->toContain('198.51.100.1');
});

test('CSV flattens nested fields, quotes values and excludes private fields', function () {
    $response = exportFrom($this, ['format' => 'csv'])->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=utf-8')
        ->assertHeader('Content-Disposition', "attachment; filename=\"clicks-{$this->project}.csv\"");
    $lines = explode("\n", $response->streamedContent());
    $header = explode(',', $lines[0]);
    $first = array_combine($header, str_getcsv($lines[1], escape: ''));
    $second = array_combine($header, str_getcsv($lines[2], escape: ''));

    expect($header)->toBe([
        '_id', 'link', 'campaign', 'project', 'destinationUrl', 'clickedAt', 'dayOfWeek', 'hourOfDay',
        'fullDateClicked', 'geo.country', 'geo.city', 'geo.ll.lat', 'geo.ll.lon', 'device.type',
        'browser.name', 'os.name', 'referrer', 'isBot', 'device.vendor',
    ])
        ->and($lines)->toHaveCount(4)
        ->and($lines[3])->toBe('')
        ->and($lines[1])->toContain('"New ""York"""')
        ->and($first)->toMatchArray([
            '_id' => (string) $this->firstClick,
            'link' => (string) $this->link,
            'clickedAt' => '2026-09-19T12:00:00.000Z',
            'geo.city' => 'New "York"',
            'geo.ll.lat' => '40.7128',
            'geo.ll.lon' => '-74.006',
            'referrer' => 'https://example.com/a,b',
            'isBot' => 'false',
            'device.vendor' => '',
        ])
        ->and($second)->toMatchArray(['referrer' => '', 'isBot' => 'true', 'device.vendor' => 'Apple'])
        ->and(strtolower($lines[0]))->not->toContain('visitor')
        ->not->toContain('ip,')
        ->and($response->streamedContent())->not->toContain('probe-visitor-id')
        ->not->toContain('203.0.113.');
});

test('a null field exports as an empty unquoted CSV cell', function () {
    $project = $this->fixtures->project($this->owner);
    $this->fixtures->click($project, $this->campaign, $this->link, ['referrer' => null]);

    $lines = explode("\n", $this->get(AnalyticsFixtures::projectUrl($project, 'export', ['format' => 'csv']))->streamedContent());

    expect($lines[0])->toEndWith('os.name,referrer,isBot')
        ->and($lines[1])->toEndWith('"Windows",,"false"');
});

test('the link filter scopes exports', function () {
    $rows = json_decode(exportFrom($this, ['linkId' => (string) $this->otherLink])->streamedContent(), true);

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['link'])->toBe((string) $this->otherLink);
});

test('an empty scope exports an empty array or an empty file', function () {
    $empty = $this->fixtures->project($this->owner);

    expect($this->get(AnalyticsFixtures::projectUrl($empty, 'export'))->assertOk()->streamedContent())->toBe('[]')
        ->and($this->get(AnalyticsFixtures::projectUrl($empty, 'export', ['format' => 'csv']))->assertOk()->streamedContent())->toBe('');
});

test('unsupported formats return 400', function (array $query) {
    exportFrom($this, $query)->assertStatus(400)->assertExactJson(['message' => 'Format must be json or csv']);
})->with([
    'xml' => [['format' => 'xml']],
    'uppercase' => [['format' => 'CSV']],
    'empty' => [['format' => '']],
    'array' => [['format' => ['csv']]],
]);

test('the link ID is validated before the format', function () {
    exportFrom($this, ['format' => 'xml', 'linkId' => 'bad'])
        ->assertStatus(400)
        ->assertExactJson(['message' => 'A valid project ID is required']);
});
