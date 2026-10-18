<?php

use App\Models\User;

test('users can delete their account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->deleteJson('/api/v1/me', ['password' => 'password'])
        ->assertNoContent();

    $this->assertGuest('web');
    $this->assertModelMissing($user);
});

test('the correct password is required to delete an account', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->deleteJson('/api/v1/me', ['password' => 'wrong-password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');

    $this->assertModelExists($user);
});
