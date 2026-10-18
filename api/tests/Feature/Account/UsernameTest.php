<?php

use App\Models\User;

test('a new user can choose a username', function () {
    $user = User::factory()->withoutUsername()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/username', ['username' => ' Jane_Doe '])
        ->assertOk()
        ->assertJsonPath('data.username', 'jane_doe');

    expect($user->refresh()->username)->toBe('jane_doe');
});

test('a username can be changed and re-saved unchanged', function () {
    $user = User::factory()->create(['username' => 'jane_doe']);

    $this->actingAs($user)->putJson('/api/v1/me/username', ['username' => 'jane_doe'])->assertOk();
    $this->actingAs($user)->putJson('/api/v1/me/username', ['username' => 'jane2'])->assertOk();

    expect($user->refresh()->username)->toBe('jane2');
});

test('a username that is taken cannot be chosen', function () {
    User::factory()->create(['username' => 'jane_doe']);
    $user = User::factory()->withoutUsername()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/username', ['username' => 'JANE_DOE'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['username' => 'already been taken']);
});

test('a reserved username cannot be chosen', function () {
    $user = User::factory()->withoutUsername()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/username', ['username' => 'admin'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['username' => 'not available']);
});

test('a malformed username cannot be chosen', function () {
    $user = User::factory()->withoutUsername()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/me/username', ['username' => '1_bad__name_'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('username');
});

test('guests cannot choose a username', function () {
    $this->putJson('/api/v1/me/username', ['username' => 'jane'])->assertUnauthorized();
});
