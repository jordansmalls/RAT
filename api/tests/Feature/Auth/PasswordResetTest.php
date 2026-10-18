<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

test('a reset link pointing at the frontend is emailed', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => strtoupper($user->email)])
        ->assertOk()
        ->assertJsonStructure(['message']);

    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
        $url = $notification->toMail($user)->actionUrl;

        return str_starts_with($url, config('app.frontend_url').'/reset-password?token=')
            && str_contains($url, 'email='.urlencode($user->email));
    });
});

test('requesting a reset link for an unknown email looks the same as a known one', function () {
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
        ->assertOk()
        ->assertJsonStructure(['message']);

    Notification::assertNothingSent();
});

test('the password can be reset with a valid token', function () {
    $user = User::factory()->unverified()->create();
    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'new-password123',
        'password_confirmation' => 'new-password123',
    ])->assertOk();

    $user->refresh();
    expect(Hash::check('new-password123', $user->passwordHash))->toBeTrue()
        ->and($user->hasVerifiedEmail())->toBeTrue();
});

test('the password cannot be reset with an invalid token', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'invalid-token',
        'email' => $user->email,
        'password' => 'new-password123',
        'password_confirmation' => 'new-password123',
    ])->assertUnprocessable()->assertJsonValidationErrors('email');

    expect(Hash::check('password', $user->refresh()->passwordHash))->toBeTrue();
});
