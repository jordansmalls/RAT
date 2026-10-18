<?php

use App\Models\Campaign;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/*
| Feature D storage: PUT/DELETE /api/v1/campaigns/{campaign}/deal. A deal is a sub-document on
| the campaign, ownership is the campaign's project owner (404, never 403), malformed ids are 400
| and the request validates like any Laravel FormRequest (422).
*/

beforeEach(function () {
    $this->rawCampaign = fn (string $id) => DB::connection('mongodb')->getCollection('campaigns')->findOne(
        ['_id' => new ObjectId($id)],
        ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']],
    );
});

test('saves a deal on an owned campaign and serializes BSON types', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);

    $this->actingAs($user)->putJson('/api/v1/campaigns/'.$campaign->id.'/deal', [
        'amount' => 2500, 'currency' => 'USD', 'category' => 'saas', 'paid_at' => '2026-02-01T12:00:00Z',
    ])->assertOk()
        ->assertJsonPath('data.message', 'Deal saved.')
        ->assertJsonPath('data.campaign._id', $campaign->id)
        ->assertJsonPath('data.campaign.deal.amount', 2500)
        ->assertJsonPath('data.campaign.deal.currency', 'USD')
        ->assertJsonPath('data.campaign.deal.category', 'saas')
        ->assertJsonPath('data.campaign.deal.paidAt', '2026-02-01T12:00:00.000Z')
        ->assertJsonMissingPath('data.campaign.deal.id');

    $stored = ($this->rawCampaign)($campaign->id);
    expect($stored['deal']['amount'])->toBeFloat()->toBe(2500.0)
        ->and($stored['deal']['currency'])->toBe('USD')
        ->and($stored['deal']['category'])->toBe('saas')
        ->and($stored['deal']['paidAt'])->toBeInstanceOf(UTCDateTime::class);
});

test('stores a null category and a null paidAt when they are omitted', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);

    $this->actingAs($user)->putJson('/api/v1/campaigns/'.$campaign->id.'/deal', [
        'amount' => 12.5, 'currency' => 'EUR',
    ])->assertOk()
        ->assertJsonPath('data.campaign.deal.category', null)
        ->assertJsonPath('data.campaign.deal.paidAt', null);

    $stored = ($this->rawCampaign)($campaign->id);
    expect($stored['deal'])->toHaveKeys(['amount', 'currency', 'category', 'paidAt'])
        ->and($stored['deal']['category'])->toBeNull()
        ->and($stored['deal']['paidAt'])->toBeNull();
});

test('rejects invalid deals with 422 validation errors', function (array $payload, array $errors) {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);

    $this->actingAs($user)->putJson('/api/v1/campaigns/'.$campaign->id.'/deal', $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors($errors);

    expect(($this->rawCampaign)($campaign->id))->not->toHaveKey('deal');
})->with([
    'missing amount' => [['currency' => 'USD'], ['amount']],
    'missing currency' => [['amount' => 5], ['currency']],
    'zero amount' => [['amount' => 0, 'currency' => 'USD'], ['amount']],
    'negative amount' => [['amount' => -5, 'currency' => 'USD'], ['amount']],
    'amount over the cap' => [['amount' => 10000001, 'currency' => 'USD'], ['amount']],
    'non numeric amount' => [['amount' => 'lots', 'currency' => 'USD'], ['amount']],
    'unsupported currency' => [['amount' => 5, 'currency' => 'JPY'], ['currency']],
    'unknown category' => [['amount' => 5, 'currency' => 'USD', 'category' => 'nope'], ['category']],
    'malformed date' => [['amount' => 5, 'currency' => 'USD', 'paid_at' => 'not-a-date'], ['paid_at']],
]);

test('returns 404 for another user and 400 for malformed ids', function () {
    $user = User::factory()->create();
    $foreign = Campaign::factory()->create();

    $this->actingAs($user);

    $this->putJson('/api/v1/campaigns/'.$foreign->id.'/deal', ['amount' => 5, 'currency' => 'USD'])
        ->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->deleteJson('/api/v1/campaigns/'.$foreign->id.'/deal')
        ->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->putJson('/api/v1/campaigns/not-an-id/deal', ['amount' => 5, 'currency' => 'USD'])
        ->assertBadRequest();
    $this->deleteJson('/api/v1/campaigns/not-an-id/deal')->assertBadRequest();

    expect(($this->rawCampaign)($foreign->id))->not->toHaveKey('deal');
});

test('deleting a deal unsets the field and returns 204', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $campaign->update(['deal' => ['amount' => 10.0, 'currency' => 'USD', 'category' => null, 'paidAt' => null]]);

    $this->actingAs($user)->deleteJson('/api/v1/campaigns/'.$campaign->id.'/deal')->assertNoContent();

    expect(($this->rawCampaign)($campaign->id))->not->toHaveKey('deal')
        ->and($campaign->refresh()->title)->not->toBeEmpty();
});
