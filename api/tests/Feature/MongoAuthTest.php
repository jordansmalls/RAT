<?php

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

it('authenticates a legacy password and migrates it without inventing an onboarding state', function () {
    $id = new ObjectId;
    $hash = str_replace('$2y$', '$2b$', Hash::make('legacy-password'));
    DB::connection('mongodb')->getCollection('users')->insertOne([
        '_id' => $id, 'name' => 'Legacy user', 'email' => 'legacy@example.com', 'password' => $hash,
        'createdAt' => new UTCDateTime, 'updatedAt' => new UTCDateTime,
    ]);

    $this->postJson('/api/v1/auth/login', ['login' => 'legacy@example.com', 'password' => 'wrong-password'])
        ->assertUnprocessable()->assertJsonValidationErrors('login');
    $raw = DB::connection('mongodb')->getCollection('users')->findOne(['_id' => $id]);
    expect($raw['password'])->toBe($hash);
    expect(isset($raw['passwordHash']))->toBeFalse();
    $this->postJson('/api/v1/auth/login', ['login' => 'LEGACY@example.com', 'password' => 'legacy-password', 'remember' => true])
        ->assertOk()->assertJsonPath('data.id', (string) $id)
        ->assertJsonPath('data.name', 'Legacy user')
        ->assertJsonPath('data.username', null)->assertJsonPath('data.onboarding_step', 'username')
        ->assertJsonPath('data.socials.youtube.count', null)
        ->assertJsonMissingPath('data.password')->assertJsonMissingPath('data.passwordHash');
    $raw = DB::connection('mongodb')->getCollection('users')->findOne(['_id' => $id]);
    expect(isset($raw['password']))->toBeFalse();
    expect(Hash::check('legacy-password', $raw['passwordHash']))->toBeTrue();
    expect($raw['passwordHash'])->not->toBe($hash);
    $this->getJson('/api/v1/projects')->assertForbidden();
});

it('serializes an existing RAT user without Prism-only optional fields', function () {
    $id = new ObjectId;
    DB::connection('mongodb')->getCollection('users')->insertOne([
        '_id' => $id, 'email' => 'rat@example.com', 'passwordHash' => str_replace('$2y$', '$2a$', Hash::make('rat-password')),
        'handle' => 'rat_creator', 'onboardingStep' => 'complete', 'createdAt' => new UTCDateTime, 'updatedAt' => new UTCDateTime,
        'socials' => ['youtube' => ['identifier' => 'creator', 'count' => 100, 'syncedAt' => new UTCDateTime]],
    ]);

    $this->postJson('/api/v1/auth/login', ['login' => 'RAT_CREATOR', 'password' => 'rat-password'])
        ->assertOk()->assertJsonPath('data.name', null)->assertJsonPath('data.email_verified_at', null)
        ->assertJsonPath('data.username', 'rat_creator')->assertJsonPath('data.onboarding_step', 'complete')
        ->assertJsonPath('data.socials.youtube.count', 100)->assertJsonPath('data.socials.twitter.identifier', '');
});

it('does not fall back to a stale legacy password when passwordHash exists', function () {
    $user = User::factory()->create();
    DB::connection('mongodb')->getCollection('users')->updateOne(['_id' => new ObjectId($user->id)], ['$set' => ['password' => Hash::make('stale-password')]]);

    $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'stale-password'])
        ->assertUnprocessable()->assertJsonValidationErrors('login');
    $this->assertGuest('web');
});

it('keeps usernames out of storage and allows multiple users without handles', function () {
    Notification::fake();
    foreach (['first@example.com', 'second@example.com'] as $email) {
        $this->postJson('/api/v1/auth/register', ['email' => $email, 'password' => 'password123', 'password_confirmation' => 'password123'])
            ->assertCreated()->assertJsonPath('data.username', null)->assertJsonPath('data.onboarding_step', 'username');
    }
    $user = User::where('email', 'second@example.com')->sole();
    $this->putJson('/api/v1/me/username', ['username' => 'second_creator'])->assertOk()->assertJsonPath('data.onboarding_step', 'socials');
    $raw = DB::connection('mongodb')->getCollection('users')->findOne(['_id' => new ObjectId($user->id)]);
    expect($raw['handle'])->toBe('second_creator');
    expect(isset($raw['username']))->toBeFalse();
    expect(isset($raw['password']))->toBeFalse();
    expect($raw['createdAt'])->toBeInstanceOf(UTCDateTime::class);
    Notification::assertCount(2);
});

it('uses a persisted Sanctum session cookie across separate guard instances', function () {
    $user = User::factory()->create();
    $login = $this->postJson('/api/v1/auth/login', ['login' => $user->email, 'password' => 'password'])->assertOk();
    $cookie = collect($login->headers->getCookies())->first(fn ($cookie) => $cookie->getName() === config('session.cookie'));
    expect($cookie)->not->toBeNull();
    Auth::forgetGuards();

    $this->withUnencryptedCookie($cookie->getName(), $cookie->getValue())->getJson('/api/v1/me')
        ->assertOk()->assertJsonPath('data.id', $user->id);
});

it('stores Sanctum tokens on Mongo and revokes them when deleting an account', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test');
    expect($token->accessToken)->toBeInstanceOf(PersonalAccessToken::class);
    expect(PersonalAccessToken::findToken($token->plainTextToken)->tokenable->id)->toBe($user->id);

    $this->actingAs($user)->deleteJson('/api/v1/me', ['password' => 'password'])->assertNoContent();
    expect(PersonalAccessToken::count())->toBe(0);
    $this->assertModelMissing($user);
});

it('runs the index migration repeatedly while preserving existing index names and privacy options', function () {
    $migration = require database_path('migrations/2026_10_17_174459_ensure_rat_indexes.php');
    DB::connection('mongodb')->getCollection('clicks')->drop();
    $users = DB::connection('mongodb')->getCollection('users');
    foreach ($users->listIndexes() as $index) {
        if ($index->getKey() === ['email' => 1]) {
            $users->dropIndex($index->getName());
        }
    }
    $users->createIndex(['email' => 1], ['name' => 'legacy_email_unique', 'unique' => true]);
    $migration->up();
    $migration->up();
    expect(collect(iterator_to_array($users->listIndexes()))->filter(fn ($index) => $index->getKey() === ['email' => 1])->sole()->getName())->toBe('legacy_email_unique');
    $indexes = iterator_to_array(DB::connection('mongodb')->getCollection('clicks')->listIndexes());
    $visitorIndex = collect($indexes)->first(fn ($index) => $index->getKey() === ['project' => 1, 'visitorId' => 1]);
    expect($visitorIndex)->not->toBeNull();
    expect((array) $visitorIndex['partialFilterExpression'])->toHaveKey('visitorId');
    $userIndexes = iterator_to_array(DB::connection('mongodb')->getCollection('users')->listIndexes());
    $handle = collect($userIndexes)->first(fn ($index) => $index->getKey() === ['handle' => 1]);
    expect($handle->isUnique())->toBeTrue();
    expect($handle->isSparse())->toBeTrue();
});

it('serializes a stored user that has no timestamps', function () {
    $id = DB::connection('mongodb')->getCollection('users')->insertOne([
        'email' => 'untimed@example.com', 'passwordHash' => Hash::make('password'), 'handle' => 'untimed', 'onboardingStep' => 'complete',
    ])->getInsertedId();

    $this->actingAs(User::findOrFail((string) $id))->getJson('/api/v1/me')->assertOk()
        ->assertJsonPath('data.created_at', null)->assertJsonPath('data.updated_at', null)
        ->assertJsonPath('data.onboarding_step', 'complete');
});
