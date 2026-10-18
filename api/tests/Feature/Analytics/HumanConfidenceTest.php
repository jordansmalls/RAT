<?php

use Laravel\Sanctum\Sanctum;
use MongoDB\BSON\ObjectId;
use Tests\Feature\Analytics\Support\AnalyticsFixtures;

/*
| Port of the old A2 human-confidence specs: humans are clicks with `isBot: false`, every click
| in scope (bots, missing and null flags) is in the denominator, 0-100 with one decimal.
*/

beforeEach(function () {
    $this->fixtures = new AnalyticsFixtures;
    $this->owner = $this->fixtures->user();
    $this->link = new ObjectId;
    $this->campaign = new ObjectId;
    Sanctum::actingAs($this->owner);
});

afterEach(function () {
    $this->fixtures->cleanup();
});

/**
 * Seed an owned project with the given bot flags (`'missing'` leaves the field out).
 *
 * @param  list<bool|null|string>  $flags
 */
function projectWithBotFlags(object $test, array $flags, ?ObjectId $link = null): ObjectId
{
    $project = $test->fixtures->project($test->owner);

    foreach ($flags as $flag) {
        $flag === 'missing'
            ? $test->fixtures->click($project, $test->campaign, $link ?? $test->link, unset: ['isBot'])
            : $test->fixtures->click($project, $test->campaign, $link ?? $test->link, ['isBot' => $flag]);
    }

    return $project;
}

function humanConfidence(object $test, ObjectId $project, array $query = []): mixed
{
    return $test->getJson(AnalyticsFixtures::projectUrl($project, 'human-confidence', $query))
        ->assertOk()
        ->assertJsonPath('data.message', 'Human confidence calculated')
        ->json('data.confidence');
}

test('87 human and 13 bot clicks produce the number 87', function () {
    $project = projectWithBotFlags($this, [...array_fill(0, 87, false), ...array_fill(0, 13, true)]);

    $response = $this->getJson(AnalyticsFixtures::projectUrl($project, 'human-confidence'));

    expect($response->getContent())->toBe('{"data":{"message":"Human confidence calculated","confidence":87}}');
});

test('rounding and boundaries hold', function (array $flags, int|float $expected) {
    expect(humanConfidence($this, projectWithBotFlags($this, $flags)))->toBe($expected);
})->with([
    'one of three' => [[false, true, true], 33.3],
    'two of three' => [[false, false, true], 66.7],
    'all human' => [[false, false], 100],
    'all bot' => [[true], 0],
    'empty' => [[], 0],
]);

test('missing and null bot flags count toward the total but not as human', function () {
    expect(humanConfidence($this, projectWithBotFlags($this, [false, false, true, 'missing', null])))->toBe(40);
});

test('project and link scopes are isolated', function () {
    $otherLink = new ObjectId;
    $project = projectWithBotFlags($this, [false, false]);
    $this->fixtures->click($project, $this->campaign, $otherLink, ['isBot' => true]);
    $other = projectWithBotFlags($this, [false, false, false]);

    expect(humanConfidence($this, $project, ['linkId' => (string) $this->link]))->toBe(100)
        ->and(humanConfidence($this, $other, ['linkId' => (string) $otherLink]))->toBe(0)
        ->and(humanConfidence($this, $project))->toBe(66.7);
});
