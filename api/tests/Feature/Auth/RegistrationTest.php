<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

test('users can register and are signed in without a username', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'email' => '  New.User@Example.com ',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'new.user@example.com')
        ->assertJsonPath('data.username', null)
        ->assertJsonPath('data.email_verified_at', null)
        ->assertJsonMissingPath('data.password');

    $this->assertAuthenticated('web');

    $user = User::sole();
    expect($user->email)->toBe('new.user@example.com');

    Notification::assertSentTo($user, VerifyEmail::class);
});

test('registration rejects an email that is already taken regardless of case', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'email' => 'TAKEN@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertUnprocessable()->assertJsonValidationErrors('email');

    $this->assertGuest('web');
});

test('registration validates input', function (array $payload, string $field) {
    $this->postJson('/api/v1/auth/register', [
        'email' => 'valid@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        ...$payload,
    ])->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'missing email' => [['email' => ''], 'email'],
    'invalid email' => [['email' => 'not-an-email'], 'email'],
    'short password' => [['password' => 'short', 'password_confirmation' => 'short'], 'password'],
    'unconfirmed password' => [['password_confirmation' => 'different123'], 'password'],
]);
