<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

test('the name can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/me', ['name' => 'Jane Doe'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Jane Doe');

    expect($user->refresh()->name)->toBe('Jane Doe');
});

test('changing the email requires verifying it again', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/me', ['email' => 'New@Example.com'])
        ->assertOk()
        ->assertJsonPath('data.email', 'new@example.com')
        ->assertJsonPath('data.email_verified_at', null);

    Notification::assertSentTo($user, VerifyEmail::class);
});

test('saving the same email keeps it verified', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/me', ['email' => strtoupper($user->email)])
        ->assertOk();

    expect($user->refresh()->hasVerifiedEmail())->toBeTrue();
    Notification::assertNothingSent();
});

test('the email cannot be changed to one that is taken', function () {
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/me', ['email' => 'taken@example.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('guests cannot update a profile', function () {
    $this->patchJson('/api/v1/me', ['name' => 'Jane'])->assertUnauthorized();
});
