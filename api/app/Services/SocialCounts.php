<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\RequestException;
use MongoDB\BSON\UTCDateTime;
use Throwable;
use UnexpectedValueException;

class SocialCounts
{
    public function __construct(private SocialCountProviders $providers) {}

    public function stale(User $user): bool
    {
        $attemptedAt = $user->getAttributes()['socialsLastAttemptedAt'] ?? null;

        if ($attemptedAt instanceof UTCDateTime) {
            $attemptedAt = $attemptedAt->toDateTime();
        }

        return ! $attemptedAt instanceof \DateTimeInterface
            || now()->getTimestampMs() - CarbonImmutable::instance($attemptedAt)->getTimestampMs() >= config('rat.social_refresh_minutes') * 60000;
    }

    public function refresh(User $user): array
    {
        $attemptedAt = now();
        $profiles = $user->socialProfiles();
        $identifiers = [];
        foreach ($profiles as $platform => $profile) {
            if ($profile['identifier'] && $platform !== 'twitch') {
                $identifiers[$platform] = $profile['identifier'];
            }
        }
        $fetched = $this->providers->fetchAll($identifiers);
        $results = [];
        foreach ($profiles as $platform => &$profile) {
            $identifier = $profile['identifier'];
            if (! $identifier) {
                continue;
            }
            if ($platform === 'twitch') {
                $profile['lastError'] = 'Automatic Twitch counts are not connected in this installation.';
                $results[] = ['platform' => $platform, 'identifier' => $identifier, 'count' => $profile['count'], 'status' => 'unsupported'];

                continue;
            }
            try {
                $result = $fetched[$platform];
                if ($result instanceof Throwable) {
                    throw $result;
                }
                if (! is_int($result['count'] ?? null) || $result['count'] < 0 || $result['count'] > 9007199254740991) {
                    throw new UnexpectedValueException(SocialCountProviders::LABELS[$platform].' returned an invalid count.');
                }
                $profile = [...$profile, 'displayName' => $result['displayName'] ?: $identifier, 'count' => $result['count'],
                    'approximate' => (bool) $result['approximate'], 'syncedAt' => new UTCDateTime($attemptedAt), 'lastError' => null];
                $results[] = ['platform' => $platform, 'identifier' => $identifier, ...$result, 'syncedAt' => $attemptedAt, 'status' => 'ok'];
            } catch (Throwable $error) {
                $message = $this->providerError($platform, $error);
                $profile['lastError'] = $message;
                $results[] = ['platform' => $platform, 'identifier' => $identifier, 'count' => $profile['count'], 'status' => 'error', 'error' => $message];
            }
        }
        unset($profile);
        $user->forceFill(['socials' => $profiles, 'socialsLastAttemptedAt' => $attemptedAt])->save();

        return $results;
    }

    private function providerError(string $platform, Throwable $error): string
    {
        if ($error instanceof UnexpectedValueException) {
            return $error->getMessage();
        }
        $label = SocialCountProviders::LABELS[$platform];
        $status = $error instanceof RequestException ? $error->response->status() : null;

        return match ($status) {
            404 => $label.' account was not found.',
            429 => $label.' rate limit reached. Try again later.',
            401, 403 => $label.' did not allow the public profile to be read.',
            default => 'Could not read the '.$label.' public count. Try again later.',
        };
    }
}
