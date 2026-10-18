<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

/**
 * Turn the frontend link from the verification email into the API path the frontend calls.
 */
function verificationApiPath(User $user): string
{
    $url = (new VerifyEmail)->toMail($user)->actionUrl;

    expect($url)->toStartWith(config('app.frontend_url').'/verify-email/');

    return str_replace(config('app.frontend_url').'/verify-email/', '/api/v1/auth/email/verify/', $url);
}

test('the email can be verified from the emailed link without being signed in', function () {
    Event::fake([Verified::class]);
    $user = User::factory()->unverified()->create();

    $this->postJson(verificationApiPath($user))->assertOk();

    expect($user->refresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
});

test('the email is not verified with a tampered signature', function () {
    $user = User::factory()->unverified()->create();

    $this->postJson(verificationApiPath($user).'tampered')->assertForbidden();

    expect($user->refresh()->hasVerifiedEmail())->toBeFalse();
});

test('the email is not verified with a hash for a different email', function () {
    $user = User::factory()->unverified()->create();
    $path = verificationApiPath($user);

    $user->update(['email' => 'changed@example.com']);

    $this->postJson($path)->assertForbidden();

    expect($user->refresh()->hasVerifiedEmail())->toBeFalse();
});

test('the verification email can be resent', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertAccepted();

    Notification::assertSentTo($user, VerifyEmail::class);
});

test('the verification email is not resent to verified users', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk();

    Notification::assertNothingSent();
});
