<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use MongoDB\Laravel\Auth\User as Authenticatable;

#[Fillable(['name', 'username', 'email', 'passwordHash'])]
#[Hidden(['password', 'passwordHash', 'remember_token', '__v'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    public const SOCIAL_PLATFORMS = ['youtube', 'instagram', 'twitter', 'twitch'];

    protected $connection = 'mongodb';

    protected $attributes = ['onboardingStep' => 'handle'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'passwordHash' => 'hashed',
            'socialsLastAttemptedAt' => 'datetime',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'passwordHash';
    }

    public function getAuthPassword(): ?string
    {
        $hash = $this->getAttributes()['passwordHash'] ?? $this->getAttributes()['password'] ?? null;

        // PHP recognizes $2y$ as bcrypt; bcryptjs writes equivalent $2a$/$2b$ hashes.
        if (is_string($hash) && (str_starts_with($hash, '$2a$') || str_starts_with($hash, '$2b$'))) {
            return '$2y$'.substr($hash, 4);
        }

        return $hash;
    }

    public function hasVerifiedEmail(): bool
    {
        return isset($this->getAttributes()['email_verified_at']);
    }

    public function getRememberToken(): ?string
    {
        return $this->getAttributes()['remember_token'] ?? null;
    }

    protected function email(): Attribute
    {
        return Attribute::make(get: fn (mixed $value): mixed => $value, set: fn (string $value): string => Str::lower(trim($value)));
    }

    protected function username(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): ?string => $attributes['handle'] ?? null,
            set: fn (?string $value): array => $value === null ? [] : ['handle' => Str::lower(trim($value))],
        );
    }

    public function hasUsername(): bool
    {
        return (bool) $this->username;
    }

    public function computedOnboardingStep(): string
    {
        if (! $this->hasUsername()) {
            return 'username';
        }

        return ($this->getAttributes()['onboardingStep'] ?? null) === 'complete' ? 'complete' : 'socials';
    }

    public function socialProfiles(): array
    {
        $stored = $this->getAttributes()['socials'] ?? [];
        $profiles = [];
        foreach (self::SOCIAL_PLATFORMS as $platform) {
            $profiles[$platform] = array_replace([
                'identifier' => '', 'displayName' => '', 'count' => null,
                'approximate' => false, 'syncedAt' => null, 'lastError' => null,
            ], (array) ($stored[$platform] ?? []));
        }

        return $profiles;
    }
}
