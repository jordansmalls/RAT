<?php

namespace App\Services;

use App\Models\Click;
use App\Models\Link;
use DeviceDetector\DeviceDetector;
use DeviceDetector\Parser\AbstractParser;
use GeoIp2\Database\Reader;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Port of the click tracking in the old server's redirect.controller.js.
 */
class RedirectTracking
{
    /** DeviceDetector device names mapped onto the old `device.type` enum. */
    private const DEVICE_TYPES = [
        'smartphone' => 'mobile', 'feature phone' => 'mobile', 'phablet' => 'mobile',
        'tablet' => 'tablet', 'desktop' => 'desktop', '' => 'desktop',
        'tv' => 'smarttv', 'smart display' => 'smarttv', 'console' => 'console', 'wearable' => 'wearable',
        'car browser' => 'embedded', 'camera' => 'embedded', 'portable media player' => 'embedded',
        'smart speaker' => 'embedded', 'peripheral' => 'embedded',
    ];

    /** DeviceDetector names that differ from the ua-parser-js 2 names already stored in clicks. */
    private const OS_NAMES = ['Mac' => 'macOS', 'iPadOS' => 'iOS', 'GNU/Linux' => 'Linux'];

    private const BROWSER_NAMES = [
        'Chrome Mobile' => 'Mobile Chrome', 'Chrome Mobile iOS' => 'Mobile Chrome',
        'Firefox Mobile' => 'Mobile Firefox', 'Firefox Mobile iOS' => 'Mobile Firefox',
        'Samsung Browser' => 'Samsung Internet', 'Microsoft Edge' => 'Edge', 'Opera Mobile' => 'Opera Mobi',
    ];

    private const ARCHITECTURES = ['x64' => 'amd64', 'x86' => 'ia32', 'ARM' => 'arm'];

    public function record(Link $link, Request $request, array $identity): void
    {
        try {
            $link->increment('clickCount');
        } catch (Throwable $error) {
            Log::warning('Short-link click counter failed.', ['exception' => $error::class]);
        }
        try {
            $now = now()->setTimezone(config('rat.click_timezone') ?: config('app.timezone'));
            $ip = $this->clientIp($request);

            Click::create([
                'link' => $link->id, 'campaign' => $link->campaign, 'project' => $link->project,
                'destinationUrl' => $link->destinationUrl,
                'clickedAt' => $now, 'dayOfWeek' => $now->dayOfWeek, 'hourOfDay' => $now->hour,
                'fullDateClicked' => ClickDates::fullDateClicked($now),
                'ip' => $ip, 'geo' => $this->geo($ip),
                ...$this->parseUserAgent($request->userAgent()),
                'referrer' => $request->header('referer'),
                ...($identity['visitorId'] ? ['visitorId' => $identity['visitorId'], 'visitorVersion' => $identity['visitorVersion']] : []),
            ]);
        } catch (Throwable $error) {
            Log::warning('Short-link click tracking failed.', ['exception' => $error::class]);
        }
    }

    /**
     * Parse a user agent into the old click fields. Bots are detected with the old
     * expression only, so classification matches historical clicks.
     *
     * @return array{device: array<string, mixed>, os: array<string, ?string>, browser: array<string, mixed>, isBot: bool}
     */
    public function parseUserAgent(?string $userAgent): array
    {
        $userAgent ??= '';
        AbstractParser::setVersionTruncation(AbstractParser::VERSION_TRUNCATION_NONE);
        $detector = new DeviceDetector($userAgent);
        $detector->skipBotDetection();
        $detector->parse();

        $os = $detector->getOs() ?: [];
        $client = $detector->getClient() ?: [];
        if (! in_array($client['type'] ?? null, ['browser', 'mobile app'], true)) {
            $client = [];
        }
        $osName = ($os['name'] ?? '') ?: null;
        $osName = $osName === null ? null : (self::OS_NAMES[$osName] ?? $osName);
        $browserName = ($client['name'] ?? '') ?: null;
        $browserVersion = ($client['version'] ?? '') ?: null;
        $engineName = ($client['engine'] ?? '') ?: null;
        $engineVersion = ($client['engine_version'] ?? '') ?: null;
        if ($browserName !== null && $engineName === null && $osName === 'iOS'
            && preg_match('/AppleWebKit\/([\d.]+)/', $userAgent, $webkit)) {
            [$engineName, $engineVersion] = ['WebKit', $webkit[1]];
        }

        return [
            'device' => [
                'type' => self::DEVICE_TYPES[$detector->getDeviceName()] ?? 'unknown',
                'vendor' => $detector->getBrandName() ?: null,
                'model' => $this->model($detector, $osName),
                'cpu' => ['architecture' => self::ARCHITECTURES[$os['platform'] ?? ''] ?? null],
            ],
            'os' => ['name' => $osName, 'version' => ($os['version'] ?? '') ?: null],
            'browser' => [
                'name' => $browserName === null ? null : (self::BROWSER_NAMES[$browserName] ?? $browserName),
                'version' => $browserVersion,
                'major' => $browserVersion !== null ? explode('.', $browserVersion)[0] : null,
                'engine' => ['name' => $engineName, 'version' => $engineVersion],
            ],
            'isBot' => (bool) preg_match('/bot|crawler|spider|crawling/i', $userAgent),
        ];
    }

    /** ua-parser-js reports Apple hardware generically ("iPhone", "iPad", "Macintosh"). */
    private function model(DeviceDetector $detector, ?string $osName): ?string
    {
        $model = $detector->getModel() ?: null;
        if ($detector->getBrandName() !== 'Apple') {
            return $model;
        }
        foreach (['iPhone', 'iPad', 'iPod'] as $family) {
            if ($model !== null && str_starts_with($model, $family)) {
                return $family;
            }
        }

        return $osName === 'macOS' ? 'Macintosh' : $model;
    }

    private function geo(?string $ip): ?array
    {
        $database = config('rat.geoip_database');
        if (! $ip || ! is_string($database) || ! is_file($database)) {
            return null;
        }
        try {
            $reader = new Reader($database);
            try {
                $city = $reader->city($ip);

                return ['country' => $city->country->isoCode, 'region' => $city->mostSpecificSubdivision->isoCode,
                    'city' => $city->city->name, 'timezone' => $city->location->timeZone,
                    'll' => ['lat' => $city->location->latitude, 'lon' => $city->location->longitude]];
            } finally {
                $reader->close();
            }
        } catch (Throwable) {
            return null;
        }
    }

    /** Match request-ip's header order, including its first valid forwarded address. */
    private function clientIp(Request $request): ?string
    {
        $candidates = [$request->header('x-client-ip')];
        foreach (explode(',', $request->header('x-forwarded-for', '')) as $value) {
            $value = trim($value);
            if (substr_count($value, ':') === 1) {
                $value = explode(':', $value)[0];
            }
            $candidates[] = $value;
        }
        foreach (['cf-connecting-ip', 'fastly-client-ip', 'true-client-ip', 'x-real-ip', 'x-cluster-client-ip', 'x-forwarded', 'forwarded-for', 'forwarded', 'x-appengine-user-ip'] as $header) {
            $candidates[] = $request->header($header);
        }
        $candidates[] = $request->server('REMOTE_ADDR');
        $candidates[] = $request->header('cf-pseudo-ipv4');
        foreach ($candidates as $candidate) {
            if (is_string($candidate) && filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }

        return null;
    }
}
