<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveSocialsRequest;
use App\Http\Resources\RatResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\SocialCountProviders;
use App\Services\SocialCounts;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialController extends Controller
{
    public function save(SaveSocialsRequest $request, SocialCountProviders $providers, SocialCounts $counts): UserResource
    {
        $user = $request->user();
        $profiles = $user->socialProfiles();
        foreach ($request->validated() as $platform => $input) {
            $identifier = trim($input ?? '') !== '' ? $providers->normalize($platform, $input) : '';
            if ($identifier !== $profiles[$platform]['identifier']) {
                $profiles[$platform] = ['identifier' => $identifier, 'displayName' => '', 'count' => null, 'approximate' => false, 'syncedAt' => null, 'lastError' => null];
            }
        }
        $user->forceFill(['socials' => $profiles, 'onboardingStep' => 'complete'])->save();
        $counts->refresh($user);

        return UserResource::make($user);
    }

    public function index(Request $request, SocialCounts $counts): RatResource
    {
        $user = $request->user();
        $refresh = $counts->stale($user) ? $counts->refresh($user) : [];

        return new RatResource(['profiles' => $this->profiles($user), 'refresh' => $refresh]);
    }

    public function refresh(Request $request, SocialCounts $counts): JsonResponse
    {
        $results = $counts->refresh($request->user());
        $attempted = array_filter($results, fn (array $result): bool => $result['status'] !== 'unsupported');
        $allFailed = count($attempted) > 0 && count(array_filter($attempted, fn (array $result): bool => $result['status'] === 'error')) === count($attempted);

        return (new RatResource(['profiles' => $this->profiles($request->user()), 'results' => $results]))->response()->setStatusCode($allFailed ? 502 : 200);
    }

    private function profiles(User $user): array
    {
        $profiles = [];
        foreach ($user->socialProfiles() as $platform => $profile) {
            if ($profile['identifier']) {
                $profiles[] = ['platform' => $platform, ...$profile];
            }
        }

        return $profiles;
    }
}
