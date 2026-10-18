<?php

namespace App\Services\SponsorReports;

use App\Http\Resources\RatResource;
use App\Models\Campaign;
use App\Models\SponsorReport;
use App\Models\User;
use App\Services\Analytics\DealValue;
use App\Services\Analytics\DecayCurve;
use App\Services\Analytics\GeoValue;
use App\Services\Analytics\TrafficQuality;
use Closure;
use Illuminate\Support\Facades\Cache;
use MongoDB\BSON\ObjectId;
use Throwable;

/**
 * Builds the public sponsor report payload for one campaign.
 *
 * Every service runs with the click match `['project' => ObjectId, 'campaign' => ObjectId]`:
 * {@see TrafficQuality}, {@see GeoValue}, {@see DecayCurve} (90-day curve) and {@see DealValue}
 * (only when the `dealValue` section is on and the campaign has a stored deal), plus
 * {@see CampaignAudience} for links and audience. Only enabled sections appear in the payload.
 * `creator`, `campaign` and `report` are always present.
 *
 * The headline uses only enabled sections and picks up to four stats, in priority order:
 * verified human clicks (plain human clicks when traffic quality is off), verified share with
 * grade, best CPC multiple vs paid ads (deal shown and the multiple is above 1), tier-1 share,
 * share of clicks after day 7.
 *
 * A section whose service is missing or throws is left out and listed in
 * `report.unavailableSections`, so one failing service never takes the page down.
 *
 * Privacy: nothing about the user beyond display name, handle and public social counts.
 * Service output is stripped of {@see PRIVATE_KEYS} (internal ids, ip, visitor ids, email) as
 * a second line of defence.
 */
class ReportBuilder
{
    /** Seconds a built payload is reused. The key includes `updatedAt`, so owner edits apply at once. */
    public const CACHE_SECONDS = 300;

    public const DECAY_DAYS = 90;

    public const AUDIENCE_DAYS = 30;

    public const TOP_COUNTRIES = 10;

    public const MAX_HEADLINE_STATS = 4;

    protected const PRIVATE_KEYS = ['_id', 'id', 'owner', 'project', 'campaign', 'link', 'ip', 'visitorId', 'visitorVersion', 'email', 'passwordHash', 'tokenHash'];

    /** @var array<string, class-string> */
    protected const SERVICES = [
        'trafficQuality' => TrafficQuality::class,
        'geo' => GeoValue::class,
        'decay' => DecayCurve::class,
        'dealValue' => DealValue::class,
    ];

    public function __construct(protected CampaignAudience $audience) {}

    /**
     * {@see build()} through the cache.
     *
     * @return array<string, mixed>
     */
    public function cached(SponsorReport $report, Campaign $campaign): array
    {
        $version = $report->updatedAt?->getTimestampMs() ?? 0;

        return Cache::remember("sponsor-report:{$report->getKey()}:{$version}", self::CACHE_SECONDS, fn () => $this->build($report, $campaign));
    }

    /**
     * @return array<string, mixed>
     */
    public function build(SponsorReport $report, Campaign $campaign): array
    {
        $sections = $report->resolvedSections();
        $match = ['project' => new ObjectId((string) $campaign->project), 'campaign' => new ObjectId((string) $campaign->getKey())];
        $deal = self::storedDeal($campaign);
        $summary = $this->audience->summary($match);

        $results = [];
        $unavailable = [];
        $runs = [
            'trafficQuality' => fn (object $service) => $service->compute($match),
            'geo' => fn (object $service) => $service->compute($match),
            'decay' => fn (object $service) => $service->compute($match, self::DECAY_DAYS),
            'dealValue' => fn (object $service) => $service->compute($match, $deal),
        ];
        foreach ($runs as $section => $run) {
            if (! $sections[$section] || ($section === 'dealValue' && $deal === null)) {
                continue;
            }
            $result = $this->runService(self::SERVICES[$section], $run);
            if ($result === null) {
                $unavailable[] = $section;
            } else {
                $results[$section] = $result;
            }
        }

        $body = [];
        if ($sections['headline']) {
            $body['headline'] = $this->headline($summary, $results);
        }
        $body = [...$body, ...$results];
        if ($sections['links']) {
            $body['links'] = $this->audience->links($match);
        }
        if ($sections['audience']) {
            $body['audience'] = $this->audience->audience($match, self::AUDIENCE_DAYS, self::TOP_COUNTRIES);
        }

        $order = array_keys(SponsorReport::DEFAULT_SECTIONS);
        uksort($body, fn (string $a, string $b) => array_search($a, $order, true) <=> array_search($b, $order, true));

        return [
            'report' => [
                'title' => (string) ($report->title ?: $campaign->title),
                'generatedAt' => now()->utc()->format('Y-m-d\TH:i:s.v\Z'),
                'period' => $summary['period'],
                'expiresAt' => RatResource::serialize($report->expiresAt),
                'sections' => array_keys($body),
                'unavailableSections' => $unavailable,
            ],
            'creator' => $this->creator((string) $report->owner),
            'campaign' => [
                'title' => (string) $campaign->title,
                'url' => (string) $campaign->url,
                'createdAt' => RatResource::serialize($campaign->createdAt),
            ],
            ...$body,
        ];
    }

    /**
     * The campaign's stored deal (Feature D shape), or null when there is none.
     *
     * @return array<string, mixed>|null
     */
    public static function storedDeal(Campaign $campaign): ?array
    {
        $deal = $campaign->getAttributes()['deal'] ?? null;
        if (is_object($deal) && method_exists($deal, 'getArrayCopy')) {
            $deal = $deal->getArrayCopy();
        }

        return is_array($deal) && is_numeric($deal['amount'] ?? null) && $deal['amount'] > 0 ? $deal : null;
    }

    /**
     * Public creator block: display name, handle and connected socials. Never the email or id.
     *
     * @return array{displayName: string|null, handle: string|null, socials: list<array<string, mixed>>, totalFollowers: int}
     */
    protected function creator(string $ownerId): array
    {
        $user = User::find($ownerId);
        if ($user === null) {
            return ['displayName' => null, 'handle' => null, 'socials' => [], 'totalFollowers' => 0];
        }

        $socials = [];
        foreach ($user->socialProfiles() as $platform => $profile) {
            if ((string) $profile['identifier'] === '' && $profile['count'] === null) {
                continue;
            }
            $socials[] = [
                'platform' => $platform,
                'handle' => (string) $profile['identifier'],
                'displayName' => (string) $profile['displayName'],
                'followers' => is_numeric($profile['count']) ? (int) $profile['count'] : null,
                'approximate' => (bool) $profile['approximate'],
                'syncedAt' => RatResource::serialize($profile['syncedAt']),
            ];
        }

        $name = $user->getAttributes()['name'] ?? null;

        return [
            'displayName' => is_string($name) && trim($name) !== '' ? trim($name) : $user->username,
            'handle' => $user->username,
            'socials' => $socials,
            'totalFollowers' => array_sum(array_map(fn (array $social) => $social['followers'] ?? 0, $socials)),
        ];
    }

    /**
     * @param  array{totalClicks: int, humanClicks: int, period: mixed}  $summary
     * @param  array<string, array<string, mixed>>  $results
     * @return array{summary: string, grade: string|null, stats: list<array{key: string, label: string, value: int|float|string, unit: string, detail: string|null}>}
     */
    protected function headline(array $summary, array $results): array
    {
        $quality = $results['trafficQuality'] ?? null;
        $geo = $results['geo'] ?? null;
        $decay = $results['decay'] ?? null;
        $deal = $results['dealValue'] ?? null;
        $grade = is_string($quality['grade'] ?? null) ? $quality['grade'] : null;

        $stats = [];
        $phrases = [];
        if ($quality !== null && isset($quality['verifiedHumanClicks'])) {
            $clicks = (int) $quality['verifiedHumanClicks'];
            $stats[] = self::stat('verifiedHumanClicks', 'Verified human clicks', $clicks, 'count', null);
            $phrases[] = number_format($clicks).' verified human '.($clicks === 1 ? 'click' : 'clicks');
        } else {
            $clicks = $summary['humanClicks'];
            $stats[] = self::stat('humanClicks', 'Human clicks', $clicks, 'count', null);
            $phrases[] = number_format($clicks).' human '.($clicks === 1 ? 'click' : 'clicks');
        }

        if ($grade !== null && isset($quality['verifiedShare'])) {
            $stats[] = self::stat('verifiedShare', 'Verified traffic', $quality['verifiedShare'], 'percent', "Grade {$grade}");
            $phrases[] = self::percent($quality['verifiedShare'])." verified traffic (grade {$grade})";
        }

        $best = $deal['bestComparison'] ?? null;
        if (is_array($best) && is_numeric($best['multiple'] ?? null) && $best['multiple'] > 1) {
            $label = self::benchmarkLabel($deal, (string) ($best['channel'] ?? ''));
            $cpc = is_numeric($deal['effectiveCpc'] ?? null) ? 'Effective CPC '.number_format((float) $deal['effectiveCpc'], 2).' '.($deal['deal']['currency'] ?? '') : null;
            $stats[] = self::stat('cpcMultiple', "Cheaper per click than {$label}", $best['multiple'], 'multiple', $cpc === null ? null : trim($cpc));
            $phrases[] = $best['multiple']."x cheaper per click than {$label}";
        }

        if ($geo !== null && (int) ($geo['humanClicks'] ?? 0) > 0 && isset($geo['tier1Share'])) {
            $stats[] = self::stat('tier1Share', 'Tier-1 audience', $geo['tier1Share'], 'percent', 'US, UK, CA, AU, DE and similar markets');
            $phrases[] = self::percent($geo['tier1Share']).' from tier-1 markets';
        }

        if ($decay !== null && (int) ($decay['humanClicks'] ?? 0) > 0 && isset($decay['shareAfterDay7'])) {
            $stats[] = self::stat('shareAfterDay7', 'Clicks after the first week', $decay['shareAfterDay7'], 'percent', ($decay['evergreen'] ?? false) ? 'Evergreen content' : null);
            $phrases[] = self::percent($decay['shareAfterDay7']).' of clicks after day 7';
        }

        $stats = array_slice($stats, 0, self::MAX_HEADLINE_STATS);
        $phrases = array_slice($phrases, 0, self::MAX_HEADLINE_STATS);

        return ['summary' => ucfirst(implode(', ', $phrases)).'.', 'grade' => $grade, 'stats' => $stats];
    }

    /**
     * Run one analytics service. Null when it isn't available yet or fails.
     *
     * @param  class-string  $class
     * @return array<string, mixed>|null
     */
    protected function runService(string $class, Closure $run): ?array
    {
        if (! class_exists($class) || ! method_exists($class, 'compute')) {
            return null;
        }

        try {
            $result = $run(app($class));
        } catch (Throwable $error) {
            report($error);

            return null;
        }

        return is_array($result) ? self::scrub(RatResource::serialize($result)) : null;
    }

    /**
     * Recursively drop private and internal-id keys.
     */
    protected static function scrub(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }
        foreach (self::PRIVATE_KEYS as $key) {
            unset($value[$key]);
        }

        return array_map(self::scrub(...), $value);
    }

    /**
     * @param  array<string, mixed>|null  $deal
     */
    protected static function benchmarkLabel(?array $deal, string $channel): string
    {
        foreach ($deal['benchmarks'] ?? [] as $benchmark) {
            if (($benchmark['channel'] ?? null) === $channel && is_string($benchmark['label'] ?? null)) {
                return $benchmark['label'];
            }
        }

        return $channel === '' ? 'paid ads' : str_replace('_', ' ', $channel);
    }

    protected static function percent(int|float $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 1), '0'), '.').'%';
    }

    /**
     * @return array{key: string, label: string, value: int|float|string, unit: string, detail: string|null}
     */
    protected static function stat(string $key, string $label, int|float|string $value, string $unit, ?string $detail): array
    {
        return ['key' => $key, 'label' => $label, 'value' => $value, 'unit' => $unit, 'detail' => $detail];
    }
}
