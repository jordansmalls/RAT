<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateUsernameRequest;
use App\Http\Resources\UserResource;
use Illuminate\Validation\ValidationException;
use MongoDB\Driver\Exception\BulkWriteException;

class UsernameController extends Controller
{
    /**
     * Set or change the signed-in user's username. Setting it the first time advances to socials.
     */
    public function update(UpdateUsernameRequest $request): UserResource
    {
        $user = $request->user();

        try {
            $firstUsername = ! $user->hasUsername();
            $user->fill(['username' => $request->validated('username')]);
            if ($firstUsername) {
                $user->onboardingStep = 'socials';
            }
            $user->save();
        } catch (BulkWriteException $error) {
            if ($error->getCode() !== 11000) {
                throw $error;
            }

            throw ValidationException::withMessages([
                'username' => __('This username has already been taken.'),
            ]);
        }

        return UserResource::make($user);
    }
}
