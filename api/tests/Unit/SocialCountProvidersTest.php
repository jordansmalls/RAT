<?php

use App\Services\SocialCountProviders;

it('parses exact and abbreviated counts without accepting malformed values', function (?string $text, ?array $expected) {
    expect((new SocialCountProviders)->parseAudienceCount($text, 'subscriber'))->toBe($expected);
})->with([
    ['2.28M subscribers', ['count' => 2280000, 'approximate' => true]],
    ['2.28 million subscribers', ['count' => 2280000, 'approximate' => true]],
    ['1,234 subscribers', ['count' => 1234, 'approximate' => false]],
    ['0 subscribers', ['count' => 0, 'approximate' => false]],
    ['1 subscriber', ['count' => 1, 'approximate' => false]],
    [null, null], ['', null], ['12 videos', null], ['-1 subscribers', null],
    ['1.2 subscribers', null], ['1,2 subscribers', null], ['bio says 3 subscribers', null],
    ['999999999999999999999 subscribers', null],
]);

it('reads only youtube channel headers and handles quoted braces', function () {
    $providers = new SocialCountProviders;
    $html = '<script>var ytInitialData = '.json_encode(['header' => ['pageHeaderRenderer' => [
        'pageTitle' => 'Example } " channel', 'content' => ['pageHeaderViewModel' => ['metadata' => ['contentMetadataViewModel' => ['metadataRows' => [
            ['metadataParts' => [['text' => ['content' => '2.28M subscribers']]]]],
        ]]]],
    ]]]).';</script>';

    expect($providers->parseYouTubePage($html, 'creator'))->toBe(['displayName' => 'Example } " channel', 'count' => 2280000, 'approximate' => true]);
    expect(fn () => $providers->parseYouTubePage('<script>var ytInitialData={"contents":{"subscriberCountText":"5M subscribers"}};</script>', 'creator'))
        ->toThrow(UnexpectedValueException::class, 'readable count');
});

it('rejects instagram suggestions and bio counts', function (string $html) {
    expect(fn () => (new SocialCountProviders)->parseInstagramPage($html, 'creator'))
        ->toThrow(UnexpectedValueException::class, 'readable count');
})->with([
    '<meta property="og:url" content="https://www.instagram.com/other/"><meta property="og:description" content="12 Followers, 4 Posts">',
    '<meta property="og:url" content="https://www.instagram.com/creator/"><meta property="og:description" content="bio says 12 Followers, 4 Posts">',
    '<title>Log in</title>',
]);

it('reads only the requested twitter profile followers link', function () {
    $html = '<a href="/other/followers">9M Followers</a><a href="/creator/verified_followers"><b>1,234</b><span>Followers</span></a>';
    expect((new SocialCountProviders)->parseTwitterPage($html, 'creator'))->toBe(['displayName' => 'creator', 'count' => 1234, 'approximate' => false]);
    expect(fn () => (new SocialCountProviders)->parseTwitterPage('<a href="/other/followers">9M Followers</a>', 'creator'))
        ->toThrow(UnexpectedValueException::class, 'readable count');
});

it('normalizes safe handles and rejects hostile identifiers for every platform', function (string $platform) {
    $providers = new SocialCountProviders;
    expect($providers->normalize($platform, ' @creator '))->toBe('creator');
    foreach (['', '@', '../admin', 'https://localhost/', 'name?x=1', 'name#other'] as $value) {
        expect(fn () => $providers->normalize($platform, $value))->toThrow(UnexpectedValueException::class);
    }
})->with(['youtube', 'instagram', 'twitter', 'twitch']);
