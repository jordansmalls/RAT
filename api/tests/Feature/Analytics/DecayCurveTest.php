<?php

use App\Services\Analytics\Bson;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Feature B: decay curve & long tail.
|
| A click's age is the whole days between its link's `createdAt` (publish time) and `clickedAt`,
| floored and clamped at 0. Human clicks only (isBot === false), clicks to missing links dropped.
| Clicks older than `days` count toward totals and the after* shares but have no bar in the curve.
*/

beforeEach(function () {
    $this->fixtures = new AnalyticsFixtures;
    $this->owner = $this->fixtures->user();
    $this->base = AnalyticsFixtures::nowMs() - 200 * AnalyticsFixtures::DAY_MS;
    Sanctum::actingAs($this->owner);
});

afterEach(function () {
    $this->fixtures->cleanup();
});

/**
 * A link published at `$baseMs`.
 */
function decayLink(object $test, ObjectId $project, ObjectId $campaign, string $platform, int $baseMs): ObjectId
{
    return $test->fixtures->link($project, $campaign, $platform, ['createdAt' => AnalyticsFixtures::date($baseMs)]);
}

/**
 * Seed one click per entry in `$days`, each `n` days after the link's publish time.
 *
 * @param  list<int>  $days
 * @param  array<string, mixed>  $attributes
 */
function decayClicks(object $test, ObjectId $project, ObjectId $campaign, ObjectId $link, int $baseMs, array $days, array $attributes = []): void
{
    foreach ($days as $day) {
        $test->fixtures->click($project, $campaign, $link, [
            'clickedAt' => AnalyticsFixtures::date($baseMs + $day * AnalyticsFixtures::DAY_MS),
            ...$attributes,
        ]);
    }
}

function decayResponse(object $test, ObjectId $project, array $query = []): TestResponse
{
    return $test->getJson(AnalyticsFixtures::projectUrl($project, 'decay', $query))
        ->assertOk()
        ->assertJsonPath('data.message', 'Decay curve calculated');
}

test('a hand-computed fixture produces the curve, half-life, p90 and shares', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = decayLink($this, $project, $campaign, 'twitter', $this->base);

    decayClicks($this, $project, $campaign, $link, $this->base, [0, 0, 0, 1, 1, 2, 4, 8, 50]);

    $data = decayResponse($this, $project, ['days' => 7])->json('data');

    expect($data['humanClicks'])->toBe(9)
        ->and($data['days'])->toBe(7)
        ->and($data['curve'])->toHaveCount(7)
        ->and($data['curve'][0])->toBe(['day' => 0, 'clicks' => 3, 'cumulative' => 3, 'cumulativeShare' => 33.3])
        ->and($data['curve'][1])->toBe(['day' => 1, 'clicks' => 2, 'cumulative' => 5, 'cumulativeShare' => 55.6])
        ->and($data['curve'][2])->toBe(['day' => 2, 'clicks' => 1, 'cumulative' => 6, 'cumulativeShare' => 66.7])
        ->and($data['curve'][3])->toBe(['day' => 3, 'clicks' => 0, 'cumulative' => 6, 'cumulativeShare' => 66.7])
        ->and($data['curve'][4])->toBe(['day' => 4, 'clicks' => 1, 'cumulative' => 7, 'cumulativeShare' => 77.8])
        ->and($data['curve'][6])->toBe(['day' => 6, 'clicks' => 0, 'cumulative' => 7, 'cumulativeShare' => 77.8])
        ->and($data['halfLifeDays'])->toBe(1)
        ->and($data['p90Days'])->toBe(50)
        ->and($data['peakDay'])->toBe(0)
        ->and($data['shareAfterDay7'])->toBe(22.2)
        ->and($data['shareAfterDay30'])->toBe(11.1)
        ->and($data['tailClicks'])->toBe(2)
        ->and($data['evergreen'])->toBeFalse();
});

test('the links list carries per-link stats for the top links', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = decayLink($this, $project, $campaign, 'twitter', $this->base);

    decayClicks($this, $project, $campaign, $link, $this->base, [0, 0, 0, 1, 1, 2, 4, 8, 50]);

    $data = decayResponse($this, $project, ['days' => 7])->json('data');

    expect($data['links'])->toHaveCount(1)
        ->and($data['links'][0])->toBe([
            'link' => (string) $link,
            'title' => 'Twitter',
            'platform' => 'twitter',
            'publishedAt' => Bson::isoDate($this->base),
            'humanClicks' => 9,
            'halfLifeDays' => 1,
            'shareAfterDay7' => 22.2,
        ]);
});

test('clicks older than days count toward totals and shares but not the curve', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = decayLink($this, $project, $campaign, 'twitter', $this->base);

    decayClicks($this, $project, $campaign, $link, $this->base, [0, 1, 40, 300]);

    $data = decayResponse($this, $project, ['days' => 7])->json('data');

    $plotted = array_sum(array_column($data['curve'], 'clicks'));

    expect($data['humanClicks'])->toBe(4)
        ->and($plotted)->toBe(2)
        ->and($data['p90Days'])->toBe(300)
        ->and($data['shareAfterDay7'])->toBe(50);
});

test('the curve is zero-filled to days and days defaults to the config value', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = decayLink($this, $project, $campaign, 'twitter', $this->base);

    decayClicks($this, $project, $campaign, $link, $this->base, [0, 0]);

    expect(config('sponsor.decay.default_days'))->toBe(90);

    $data = decayResponse($this, $project)->json('data');

    expect($data['days'])->toBe(90)
        ->and($data['curve'])->toHaveCount(90)
        ->and($data['curve'][0]['day'])->toBe(0)
        ->and($data['curve'][89]['day'])->toBe(89)
        ->and($data['curve'][89]['cumulative'])->toBe(2);
});

test('bots and unclassified clicks are excluded', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = decayLink($this, $project, $campaign, 'twitter', $this->base);

    decayClicks($this, $project, $campaign, $link, $this->base, [0, 0]);
    decayClicks($this, $project, $campaign, $link, $this->base, [0, 0, 0], ['isBot' => true]);
    $this->fixtures->click($project, $campaign, $link, ['clickedAt' => AnalyticsFixtures::date($this->base)], ['isBot']);

    $data = decayResponse($this, $project, ['days' => 7])->json('data');

    expect($data['humanClicks'])->toBe(2)
        ->and($data['curve'][0]['clicks'])->toBe(2)
        ->and($data['links'])->toHaveCount(1);
});

test('clicks whose link is gone are dropped', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $link = decayLink($this, $project, $campaign, 'twitter', $this->base);

    decayClicks($this, $project, $campaign, $link, $this->base, [0]);

    $ghost = new ObjectId;
    $this->fixtures->click($project, $campaign, $ghost, ['clickedAt' => AnalyticsFixtures::date($this->base)]);

    $data = decayResponse($this, $project, ['days' => 7])->json('data');

    expect($data['humanClicks'])->toBe(1)
        ->and($data['links'])->toHaveCount(1)
        ->and($data['links'][0]['link'])->toBe((string) $link);
});

test('linkId scoping limits the curve to one link', function () {
    $project = $this->fixtures->project($this->owner);
    $campaign = $this->fixtures->campaign($project);
    $first = decayLink($this, $project, $campaign, 'twitter', $this->base);
    $second = decayLink($this, $project, $campaign, 'linkedin', $this->base);

    decayClicks($this, $project, $campaign, $first, $this->base, [0, 0]);
    decayClicks($this, $project, $campaign, $second, $this->base, [0, 1, 1]);

    expect(decayResponse($this, $project)->json('data.humanClicks'))->toBe(5);

    $scoped = decayResponse($this, $project, ['linkId' => (string) $first])->json('data');

    expect($scoped['humanClicks'])->toBe(2)
        ->and($scoped['links'])->toHaveCount(1)
        ->and($scoped['links'][0]['link'])->toBe((string) $first);
});

test('campaignId scoping limits the curve to one campaign', function () {
    $project = $this->fixtures->project($this->owner);
    $first = $this->fixtures->campaign($project);
    $second = $this->fixtures->campaign($project);
    $firstLink = decayLink($this, $project, $first, 'twitter', $this->base);
    $secondLink = decayLink($this, $project, $second, 'twitter', $this->base);

    decayClicks($this, $project, $first, $firstLink, $this->base, [0, 0]);
    decayClicks($this, $project, $second, $secondLink, $this->base, [0, 1, 1, 1]);

    expect(decayResponse($this, $project)->json('data.humanClicks'))->toBe(6)
        ->and(decayResponse($this, $project, ['campaignId' => (string) $first])->json('data.humanClicks'))->toBe(2)
        ->and(decayResponse($this, $project, ['campaignId' => (string) $second])->json('data.humanClicks'))->toBe(4);
});

test('an empty scope returns nulls and a zero curve', function () {
    $project = $this->fixtures->project($this->owner);

    $data = decayResponse($this, $project, ['days' => 7])->json('data');

    expect($data['humanClicks'])->toBe(0)
        ->and($data['curve'])->toHaveCount(7)
        ->and(array_sum(array_column($data['curve'], 'clicks')))->toBe(0)
        ->and($data['curve'][0]['cumulativeShare'])->toBe(0)
        ->and($data['halfLifeDays'])->toBeNull()
        ->and($data['p90Days'])->toBeNull()
        ->and($data['peakDay'])->toBeNull()
        ->and($data['shareAfterDay7'])->toBe(0)
        ->and($data['shareAfterDay30'])->toBe(0)
        ->and($data['tailClicks'])->toBe(0)
        ->and($data['evergreen'])->toBeFalse()
        ->and($data['links'])->toBe([]);
});

test('days outside 7..365 and non-integers are a 422', function (mixed $days) {
    $project = $this->fixtures->project($this->owner);

    $this->getJson(AnalyticsFixtures::projectUrl($project, 'decay', ['days' => $days]))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['days']);
})->with([3, 366, 'abc', '3.5']);

test('analytics requires authentication', function () {
    $this->app['auth']->forgetGuards();

    $project = $this->fixtures->project($this->owner);

    $this->getJson(AnalyticsFixtures::projectUrl($project, 'decay'))->assertUnauthorized();
});

test('another user\'s project is a 404 and a malformed id is a 400', function () {
    $intruder = $this->fixtures->user();
    $intruderProject = $this->fixtures->project($intruder);

    $this->getJson(AnalyticsFixtures::projectUrl($intruderProject, 'decay'))
        ->assertNotFound()
        ->assertExactJson(['message' => 'Project not found.']);

    $this->getJson(AnalyticsFixtures::projectUrl('not-an-object-id', 'decay'))
        ->assertBadRequest()
        ->assertExactJson(['message' => 'Use a valid project ID.']);
});

test('a campaign from another project is a 404', function () {
    $intruder = $this->fixtures->user();
    $intruderProject = $this->fixtures->project($intruder);
    $foreignCampaign = $this->fixtures->campaign($intruderProject);

    $project = $this->fixtures->project($this->owner);

    $this->getJson(AnalyticsFixtures::projectUrl($project, 'decay', ['campaignId' => (string) $foreignCampaign]))
        ->assertNotFound()
        ->assertExactJson(['message' => 'Campaign not found.']);
});
