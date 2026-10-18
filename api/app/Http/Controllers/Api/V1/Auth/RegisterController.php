<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use MongoDB\Driver\Exception\BulkWriteException;

class RegisterController extends Controller
{
    /**
     * Create an account and sign the new user in. The user picks a username in a separate step.
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        try {
            $user = User::create([...$request->safe()->except(['password', 'password_confirmation']), 'passwordHash' => $request->validated('password')]);
        } catch (BulkWriteException $error) {
            if ($error->getCode() !== 11000) {
                throw $error;
            }

            throw ValidationException::withMessages([
                'email' => __('validation.unique', ['attribute' => 'email']),
            ]);
        }

        $user->refresh();

        event(new Registered($user));

        Auth::guard('web')->login($user);

        $request->session()->regenerate();

        return UserResource::make($user)->response()->setStatusCode(201);
    }
}
