<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdatePasswordRequest;
use Illuminate\Http\Response;

class PasswordController extends Controller
{
    /**
     * Change the signed-in user's password.
     *
     * Sanctum's AuthenticateSession middleware signs out the user's other
     * sessions because the password hash changed. The current session stays signed in.
     */
    public function update(UpdatePasswordRequest $request): Response
    {
        $request->user()->update([
            'passwordHash' => $request->validated('password'),
        ]);

        return response()->noContent();
    }
}
