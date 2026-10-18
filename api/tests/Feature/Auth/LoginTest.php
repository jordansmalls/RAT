<?php

use App\Models\User;

test('users can sign in with their email', function () {
    $user = User::factory()->create(['email' => 'jane@example.com']);

    $this->postJson('/api/v1/auth/login', [
        'login' => 'Jane@Example.com',
        'password' => 'password',
    ])->assertOk()->assertJsonPath('data.id', $user->id);

    $this->assertAuthenticatedAs($user, 'web');
});

test('users can sign in with their username', function () {
    $user = User::factory()->create(['username' => 'jane_doe']);

    $this->postJson('/api/v1/auth/login', [
        'login' => 'Jane_Doe',
        'password' => 'password',
    ])->assertOk()->assertJsonPath('data.username', 'jane_doe');

    $this->assertAuthenticatedAs($user, 'web');
});

test('users cannot sign in with an invalid password', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/login', [
        'login' => $user->email,
        'password' => 'wrong-password',
    ])->assertUnprocessable()->assertJsonValidationErrors('login');

    $this->assertGuest('web');
});

test('sign in is rate limited after too many failed attempts', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'wrong-password'])
            ->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'password'])
        ->assertTooManyRequests()
        ->assertJsonValidationErrors('login');

    $this->assertGuest('web');
});

test('users can sign out', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'web')
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    $this->assertGuest('web');
});

test('signing out while signed out succeeds', function () {
    $this->postJson('/api/v1/auth/logout')->assertNoContent();
});

test('the current user can be fetched', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertExactJsonStructure(['data' => ['id', 'name', 'username', 'email', 'email_verified_at', 'onboarding_step', 'socials', 'created_at', 'updated_at']])
        ->assertJsonPath('data.id', $user->id);
});

test('guests cannot fetch the current user', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('api responses are json even without an accept header', function () {
    $this->get('/api/v1/me')->assertUnauthorized()->assertJson(['message' => 'Unauthenticated.']);
});
