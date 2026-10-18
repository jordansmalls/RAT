<?php

use App\Services\Analytics\ClickScope;
use MongoDB\BSON\ObjectId;

const VALID_PROJECT = '507f1f77bcf86cd799439011';
const VALID_LINK = '507f191e810c19729de860ea';

test('strict 24-hex strings build an ObjectId match', function () {
    $match = ClickScope::build(VALID_PROJECT);

    expect($match['project'])->toBeInstanceOf(ObjectId::class)
        ->and((string) $match['project'])->toBe(VALID_PROJECT)
        ->and($match)->not->toHaveKey('link');

    $withLink = ClickScope::build(VALID_PROJECT, true, VALID_LINK);

    expect((string) $withLink['project'])->toBe(VALID_PROJECT)
        ->and((string) $withLink['link'])->toBe(VALID_LINK);
});

test('malformed project IDs are rejected', function (mixed $projectId) {
    expect(ClickScope::build($projectId))->toBeNull();
})->with([
    '',
    '   ',
    'not-an-id',
    '507f1f77bcf86cd79943901',
    '507f1f77bcf86cd7994390111',
    'zzzzzzzzzzzzzzzzzzzzzzzz',
    '507F1F77BCF86CD79943901Z',
    "507f1f77bcf86cd799439011\n",
    '123456789012',
    123,
    0,
    true,
    null,
    [['a']],
]);

test('an explicitly supplied link ID must be valid', function (mixed $linkId) {
    expect(ClickScope::build(VALID_PROJECT, true, $linkId))->toBeNull();
})->with([
    'bad',
    '',
    null,
    '507f1f77bcf86cd79943901',
    [['a']],
    12345,
    false,
]);

test('only an absent link ID means no link filter', function () {
    expect(array_keys(ClickScope::build(VALID_PROJECT, false, null)))->toBe(['project'])
        ->and(ClickScope::fromQuery(new ObjectId(VALID_PROJECT), []))->toHaveKeys(['project'])
        ->and(ClickScope::fromQuery(new ObjectId(VALID_PROJECT), ['linkId' => null]))->toBeNull()
        ->and((string) ClickScope::fromQuery(new ObjectId(VALID_PROJECT), ['linkId' => VALID_LINK])['link'])->toBe(VALID_LINK);
});

test('ObjectId instances are not accepted as external IDs', function () {
    expect(ClickScope::isStrictObjectIdString(new ObjectId))->toBeFalse()
        ->and(ClickScope::isStrictObjectIdString(VALID_PROJECT))->toBeTrue();
});
