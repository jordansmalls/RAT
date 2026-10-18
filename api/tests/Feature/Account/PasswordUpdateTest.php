<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('the password can be changed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/password', [
            'current_password' => 'password',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])
        ->assertNoContent();

    expect(Hash::check('new-password123', $user->refresh()->passwordHash))->toBeTrue();

    $this->getJson('/api/v1/me')->assertOk();
});

test('the current password must be correct', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');
});

test('the new password must differ from the current one', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/password', [
            'current_password' => 'password',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});
