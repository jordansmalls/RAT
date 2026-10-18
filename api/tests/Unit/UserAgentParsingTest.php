<?php

use App\Services\RedirectTracking;

/*
| Expected values are the fields the old server stored for the same user agent with
| ua-parser-js 2.0.8 (device.type, device.vendor, device.cpu.architecture, os.name,
| os.version, browser.name, browser.version, browser.major, browser.engine.name,
| browser.engine.version), so new clicks group with historical ones.
*/
it('maps user agents onto the fields ua-parser-js stored', function (string $userAgent, array $expected) {
    $parsed = (new RedirectTracking)->parseUserAgent($userAgent);

    expect([
        $parsed['device']['type'], $parsed['device']['vendor'], $parsed['device']['cpu']['architecture'],
        $parsed['os']['name'], $parsed['os']['version'],
        $parsed['browser']['name'], $parsed['browser']['version'], $parsed['browser']['major'],
        $parsed['browser']['engine']['name'], $parsed['browser']['engine']['version'],
    ])->toBe($expected);
})->with([
    'Windows Chrome' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.71 Safari/537.36', ['desktop', null, 'amd64', 'Windows', '10', 'Chrome', '120.0.6099.71', '120', 'Blink', '120.0.6099.71']],
    'iPhone Safari' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', ['mobile', 'Apple', null, 'iOS', '17.0', 'Mobile Safari', '17.0', '17', 'WebKit', '605.1.15']],
    'macOS Firefox' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0', ['desktop', 'Apple', null, 'macOS', '10.15', 'Firefox', '131.0', '131', 'Gecko', '131.0']],
    'macOS Safari' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', ['desktop', 'Apple', null, 'macOS', '10.15.7', 'Safari', '17.1', '17', 'WebKit', '605.1.15']],
    'iPad Safari' => ['Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', ['tablet', 'Apple', null, 'iOS', '17.1', 'Mobile Safari', '17.1', '17', 'WebKit', '605.1.15']],
    'Android Chrome' => ['Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36', ['mobile', 'Samsung', null, 'Android', '14', 'Mobile Chrome', '120.0.6099.144', '120', 'Blink', '120.0.6099.144']],
    'Samsung Internet' => ['Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36', ['mobile', 'Samsung', null, 'Android', '13', 'Samsung Internet', '23.0', '23', 'Blink', '115.0.0.0']],
    'Edge' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91', ['desktop', null, 'amd64', 'Windows', '10', 'Edge', '120.0.2210.91', '120', 'Blink', '120.0.0.0']],
    'Instagram in-app' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 309.0.0.40.113 (iPhone15,2; iOS 17_1; en_US; en; scale=3.00; 1179x2556; 538397120)', ['mobile', 'Apple', null, 'iOS', '17.1', 'Instagram', '309.0.0.40.113', '309', 'WebKit', '605.1.15']],
    'Facebook in-app' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.33.116;FBBV/545551254;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.1;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5]', ['mobile', 'Apple', null, 'iOS', '17.1', 'Facebook', '440.0.0.33.116', '440', 'WebKit', '605.1.15']],
    'Chrome on iOS' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1', ['mobile', 'Apple', null, 'iOS', '17.1', 'Mobile Chrome', '120.0.6099.119', '120', 'WebKit', '605.1.15']],
    'Android Firefox' => ['Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0', ['mobile', null, null, 'Android', '14', 'Mobile Firefox', '121.0', '121', 'Gecko', '121.0']],
    'Linux Chrome' => ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ['desktop', null, 'amd64', 'Linux', null, 'Chrome', '120.0.0.0', '120', 'Blink', '120.0.0.0']],
    'Chrome OS' => ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ['desktop', null, 'amd64', 'Chrome OS', '14541.0.0', 'Chrome', '120.0.0.0', '120', 'Blink', '120.0.0.0']],
    'Android tablet Chrome' => ['Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ['tablet', 'Samsung', null, 'Android', '12', 'Chrome', '120.0.0.0', '120', 'Blink', '120.0.0.0']],
    'Tizen TV' => ['Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36', ['smarttv', 'Samsung', null, 'Tizen', '6.0', 'Samsung Internet', '4.0', '4', 'Blink', '76.0.3809.146']],
    'Googlebot' => ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', ['desktop', null, null, null, null, null, null, null, null, null]],
    'Windows Firefox' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0', ['desktop', null, 'amd64', 'Windows', '10', 'Firefox', '121.0', '121', 'Gecko', '121.0']],
    'curl' => ['curl/8.4.0', ['desktop', null, null, null, null, null, null, null, null, null]],
    'empty' => ['', ['desktop', null, null, null, null, null, null, null, null, null]],
]);

it('reports Apple hardware with the generic ua-parser-js model names', function (string $userAgent, string $model) {
    expect((new RedirectTracking)->parseUserAgent($userAgent)['device']['model'])->toBe($model);
})->with([
    'iPhone' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 309.0.0.40.113 (iPhone15,2; iOS 17_1; en_US; en; scale=3.00; 1179x2556; 538397120)', 'iPhone'],
    'iPad' => ['Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', 'iPad'],
    'Mac' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', 'Macintosh'],
]);

it('flags bots with the old expression only', function (?string $userAgent, bool $isBot) {
    expect((new RedirectTracking)->parseUserAgent($userAgent)['isBot'])->toBe($isBot);
})->with([
    'Googlebot' => ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', true],
    'crawler' => ['ExampleCrawler/1.0', true],
    'spider' => ['Baiduspider/2.0', true],
    'facebook preview fetcher' => ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', false],
    'browser' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.71 Safari/537.36', false],
    'missing header' => [null, false],
]);
