<?php

use App\Models\User;
use App\Services\Analytics\Collections;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

test('it seeds demo data for an existing account and is repeatable', function () {
    $user = User::factory()->create(['email' => 'demo-owner@example.com']);

    $this->artisan('rat:seed-demo', ['--email' => 'Demo-Owner@example.com'])->assertExitCode(0);

    $owner = new ObjectId((string) $user->getKey());
    expect(Collections::projects()->countDocuments(['owner' => $owner]))->toBe(4)
        ->and(Collections::campaigns()->countDocuments())->toBe(12)
        ->and(Collections::links()->countDocuments())->toBe(132);

    $clicks = Collections::clicks()->countDocuments();
    $click = Collections::clicks()->findOne([], ['typeMap' => ['root' => 'array', 'document' => 'array']]);
    expect($clicks)->toBeGreaterThan(0)
        ->and($click['link'])->toBeInstanceOf(ObjectId::class)
        ->and($click['clickedAt'])->toBeInstanceOf(UTCDateTime::class);

    Collections::projects()->updateOne(['owner' => $owner], ['$set' => ['clientName' => 'Edited']]);

    $this->artisan('rat:seed-demo', ['--email' => 'demo-owner@example.com'])
        ->expectsOutputToContain('"projects": 0')
        ->assertExitCode(0);

    expect(Collections::clicks()->countDocuments())->toBe($clicks)
        ->and(Collections::projects()->countDocuments(['clientName' => 'Edited']))->toBe(1);
});

test('dry run writes nothing', function () {
    User::factory()->create(['email' => 'demo-owner@example.com']);

    $this->artisan('rat:seed-demo', ['--email' => 'demo-owner@example.com', '--dry-run' => true])
        ->expectsOutputToContain('"dryRun": true')
        ->assertExitCode(0);

    expect(Collections::projects()->countDocuments())->toBe(0);
});

test('it requires an existing account', function () {
    $this->artisan('rat:seed-demo')->assertExitCode(1);
    $this->artisan('rat:seed-demo', ['--email' => 'nobody@example.com'])
        ->expectsOutputToContain('The seed account does not exist.')
        ->assertExitCode(1);
});
