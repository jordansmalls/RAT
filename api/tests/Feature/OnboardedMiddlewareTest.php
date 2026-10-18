<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware(['api', 'auth:sanctum', 'onboarded'])
        ->get('/api/testing/onboarded', fn () => ['ok' => true]);
});

test('users with a username pass the onboarded middleware', function () {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/testing/onboarded')
        ->assertOk();
});

test('users without a username are blocked by the onboarded middleware', function () {
    $this->actingAs(User::factory()->withoutUsername()->create())
        ->getJson('/api/testing/onboarded')
        ->assertForbidden();
});
