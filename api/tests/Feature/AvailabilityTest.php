<?php

use App\Models\User;

test('an unused email is available', function () {
    $this->getJson('/api/v1/availability/email?email=fresh@example.com')
        ->assertOk()
        ->assertExactJson(['available' => true, 'reason' => null]);
});

test('a registered email is taken regardless of case', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->getJson('/api/v1/availability/email?email=Taken@Example.com')
        ->assertOk()
        ->assertExactJson(['available' => false, 'reason' => 'taken']);
});

test('the signed in user\'s own email is available to them', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/availability/email?'.http_build_query(['email' => $user->email]))
        ->assertOk()
        ->assertJsonPath('available', true);
});

test('a malformed email is rejected', function () {
    $this->getJson('/api/v1/availability/email?email=nope')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

test('an unused username is available', function () {
    $this->getJson('/api/v1/availability/username?username=fresh_name')
        ->assertOk()
        ->assertExactJson(['available' => true, 'reason' => null]);
});

test('a claimed username is taken regardless of case', function () {
    User::factory()->create(['username' => 'jane_doe']);

    $this->getJson('/api/v1/availability/username?username=JANE_DOE')
        ->assertOk()
        ->assertExactJson(['available' => false, 'reason' => 'taken']);
});

test('a reserved username is unavailable', function () {
    $this->getJson('/api/v1/availability/username?username=admin')
        ->assertOk()
        ->assertExactJson(['available' => false, 'reason' => 'reserved']);
});

test('the signed in user\'s own username is available to them', function () {
    $user = User::factory()->create(['username' => 'jane_doe']);

    $this->actingAs($user)
        ->getJson('/api/v1/availability/username?username=jane_doe')
        ->assertOk()
        ->assertJsonPath('available', true);
});

test('a malformed username is rejected', function (string $username) {
    $this->getJson('/api/v1/availability/username?'.http_build_query(['username' => $username]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('username');
})->with([
    'too short' => 'ab',
    'too long' => str_repeat('a', 31),
    'starts with a number' => '1jane',
    'starts with an underscore' => '_jane',
    'ends with an underscore' => 'jane_',
    'double underscore' => 'jane__doe',
    'invalid characters' => 'jane.doe',
    'empty' => '',
]);

test('availability checks are rate limited', function () {
    foreach (range(1, 60) as $attempt) {
        $this->getJson('/api/v1/availability/username?username=fresh_name')->assertOk();
    }

    $this->getJson('/api/v1/availability/username?username=fresh_name')->assertTooManyRequests();
});
