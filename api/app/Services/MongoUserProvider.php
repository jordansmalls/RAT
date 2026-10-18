<?php

namespace App\Services;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class MongoUserProvider extends EloquentUserProvider
{
    /** Migrate before SessionGuard captures the password hash for the session and remember cookie. */
    public function rehashPasswordIfRequired(Authenticatable $user, #[\SensitiveParameter] array $credentials, bool $force = false): void
    {
        if (array_key_exists('password', $user->getAttributes())) {
            $user->forceFill(['passwordHash' => $this->hasher->make($credentials['password'])]);
            $user->unset('password');
            $user->save();

            return;
        }

        parent::rehashPasswordIfRequired($user, $credentials, $force);
    }
}
