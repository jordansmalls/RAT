<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\EmailAvailabilityRequest;
use App\Http\Requests\Availability\UsernameAvailabilityRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Lets forms check identifiers as the user types. Invalid formats return a 422;
 * well-formed values return `available` and, when unavailable, a `reason`.
 * The signed-in user's own email/username counts as available.
 */
class AvailabilityController extends Controller
{
    /**
     * Check whether an email address can be used for a new account.
     */
    public function email(EmailAvailabilityRequest $request): JsonResponse
    {
        $isTaken = $this->isTaken('email', $request->validated('email'), $request->user('sanctum')?->id);

        return $this->respond($isTaken ? 'taken' : null);
    }

    /**
     * Check whether a username can be claimed.
     */
    public function username(UsernameAvailabilityRequest $request): JsonResponse
    {
        $username = $request->validated('username');

        $reason = match (true) {
            in_array($username, config('usernames.reserved'), true) => 'reserved',
            $this->isTaken('handle', $username, $request->user('sanctum')?->id) => 'taken',
            default => null,
        };

        return $this->respond($reason);
    }

    /**
     * Determine if another user already has the given value.
     */
    protected function isTaken(string $column, string $value, ?string $ignoreUserId): bool
    {
        return User::query()
            ->where($column, $value)
            ->when($ignoreUserId, fn ($query, string $id) => $query->whereKeyNot($id))
            ->exists();
    }

    /**
     * Build the availability response.
     *
     * @param  'taken'|'reserved'|null  $reason
     */
    protected function respond(?string $reason): JsonResponse
    {
        return response()->json([
            'available' => $reason === null,
            'reason' => $reason,
        ]);
    }
}
