<?php

use App\Models\Campaign;
use App\Models\Click;
use App\Models\Link;
use App\Models\Project;
use App\Models\User;
use App\Services\SlugGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

it('creates and serializes projects using the Express envelope and BSON types', function () {
    $user = User::factory()->create();
    $response = $this->actingAs($user)->postJson('/api/v1/projects', [
        'clientName' => ' Example client ', 'description' => ' Description ', 'owner' => (string) new ObjectId,
    ])->assertCreated()->assertJsonPath('data.message', 'Project creation successful!')
        ->assertJsonPath('data.project.owner', $user->id)
        ->assertJsonPath('data.project.clientName', 'Example client')
        ->assertJsonMissingPath('data.project.id');

    $id = $response->json('data.project._id');
    $stored = DB::connection('mongodb')->getCollection('projects')->findOne(['_id' => new ObjectId($id)]);
    expect($stored['owner'])->toBeInstanceOf(ObjectId::class);
    expect($stored['createdAt'])->toBeInstanceOf(UTCDateTime::class);
    expect($stored['description'])->toBe('Description');
    $this->getJson('/api/v1/projects/'.$id)->assertOk()->assertJsonPath('data.project._id', $id);
    $this->putJson('/api/v1/projects/'.$id, ['clientName' => 'Updated', 'description' => 'New description'])
        ->assertOk()->assertJsonPath('data.project.clientName', 'Updated');
    expect(Project::find($id)->description)->toBe('New description');
});

it('lists only owned projects newest first and reports an empty list as 404', function () {
    $this->freezeTime();
    $user = User::factory()->create();
    Project::factory()->create();
    $this->actingAs($user)->getJson('/api/v1/projects')->assertNotFound();
    $old = Project::factory()->create(['owner' => $user->id, 'createdAt' => now()->subDay()]);
    $new = Project::factory()->create(['owner' => $user->id]);

    $this->getJson('/api/v1/projects')->assertOk()->assertJsonCount(2, 'data.projects')
        ->assertJsonPath('data.message', '2 projects found.')
        ->assertJsonPath('data.projects.0._id', $new->id)
        ->assertJsonPath('data.projects.1._id', $old->id)
        ->assertJsonMissingPath('data.projects.0.id');
});

it('creates ten platform links and manually adds an other link', function () {
    config(['rat.base_url' => 'https://short.example']);
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $response = $this->actingAs($user)->postJson('/api/v1/campaigns', [
        'project_id' => $project->id, 'title' => ' Launch ', 'url' => 'https://example.com/launch',
    ])->assertCreated()->assertJsonPath('data.message', 'Campaign successfully created!')
        ->assertJsonPath('data.campaign.title', 'Launch')->assertJsonCount(10, 'data.links');
    $campaignId = $response->json('data.campaign._id');
    $slugs = [];
    foreach ($response->json('data.links') as $link) {
        expect($link['slug'])->toMatch('/^[a-z0-9]{4}$/');
        expect($link['customUrl'])->toBe('https://short.example/'.$link['slug']);
        expect($link['project'])->toBe($project->id);
        expect($link['campaign'])->toBe($campaignId);
        expect($link['clickCount'])->toBe(0);
        expect($link['isActive'])->toBeTrue();
        $slugs[] = $link['slug'];
    }
    expect(array_unique($slugs))->toHaveCount(10);
    $this->getJson('/api/v1/campaigns/'.$campaignId)->assertOk()->assertJsonPath('data._id', $campaignId)->assertJsonMissingPath('data.campaign');
    $this->postJson('/api/v1/campaigns/manual', ['project_id' => $project->id, 'campaign_id' => $campaignId, 'title' => 'Newsletter'])
        ->assertCreated()->assertJsonPath('data.link.platform', 'other')
        ->assertJsonPath('data.message', 'Successfully created the "Newsletter" link.');
    $this->getJson('/api/v1/campaigns/'.$campaignId.'/links')->assertOk()->assertJsonCount(11, 'data.links');
    $this->getJson('/api/v1/projects/'.$project->id.'/campaigns')->assertOk()->assertJsonPath('data.campaigns.0.linkCount', 11);
    $this->getJson('/api/v1/campaigns')->assertOk()->assertJsonCount(1, 'data.campaigns');
    expect(Link::count())->toBe(11);
    $raw = DB::connection('mongodb')->getCollection('links')->findOne([]);
    expect($raw['project'])->toBeInstanceOf(ObjectId::class);
    expect($raw['campaign'])->toBeInstanceOf(ObjectId::class);
});

it('updates every destination in a campaign while preserving slugs and history', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $link = Link::factory()->create(['project' => $project->id, 'campaign' => $campaign->id]);
    $click = Click::factory()->create(['link' => $link->id, 'campaign' => $campaign->id, 'project' => $project->id]);

    $this->actingAs($user)->putJson('/api/v1/campaigns/'.$campaign->id, ['title' => 'New title', 'url' => 'https://example.com/new'])
        ->assertOk()->assertJsonPath('data.campaign.url', 'https://example.com/new');
    expect($link->refresh()->destinationUrl)->toBe('https://example.com/new');
    expect($link->slug)->not->toBeEmpty();
    expect($click->refresh()->destinationUrl)->toBe('https://example.com/destination');
});

it('returns 404 for every resource owned by another user', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $this->actingAs($user);

    $this->getJson('/api/v1/projects/'.$project->id)->assertNotFound();
    $this->putJson('/api/v1/projects/'.$project->id, ['clientName' => 'Name', 'description' => 'Description'])->assertNotFound();
    $this->deleteJson('/api/v1/projects/'.$project->id, ['confirmation' => true])->assertNotFound();
    $this->getJson('/api/v1/projects/'.$project->id.'/campaigns')->assertNotFound();
    $this->postJson('/api/v1/campaigns', ['project_id' => $project->id, 'title' => 'Title', 'url' => 'https://example.com'])->assertNotFound();
    $this->getJson('/api/v1/campaigns/'.$campaign->id)->assertNotFound();
    $this->getJson('/api/v1/campaigns/'.$campaign->id.'/links')->assertNotFound();
    $this->getJson('/api/v1/campaigns/'.$campaign->id.'/performance')->assertNotFound();
    $this->putJson('/api/v1/campaigns/'.$campaign->id, ['title' => 'Title', 'url' => 'https://example.com'])->assertNotFound();
    $this->deleteJson('/api/v1/campaigns/'.$campaign->id, ['confirmation' => true])->assertNotFound();
    $own = Project::factory()->create(['owner' => $user->id]);
    $this->postJson('/api/v1/campaigns/manual', ['project_id' => $own->id, 'campaign_id' => $campaign->id, 'title' => 'Title'])->assertNotFound();
    $this->assertModelExists($campaign);
});

it('cascades project deletion and preserves another project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $link = Link::factory()->create(['project' => $project->id, 'campaign' => $campaign->id]);
    $click = Click::factory()->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id]);
    $other = Click::factory()->create();

    $this->actingAs($user)->deleteJson('/api/v1/projects/'.$project->id, ['confirmation' => true])
        ->assertOk()->assertExactJson(['data' => ['message' => 'Project and all related data deleted successfully']]);
    foreach ([$project, $campaign, $link, $click] as $model) {
        $this->assertModelMissing($model);
    }
    $this->assertModelExists($other);
});

it('returns an empty 204 when cascading campaign deletion', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $link = Link::factory()->create(['project' => $project->id, 'campaign' => $campaign->id]);
    $click = Click::factory()->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id]);

    $this->actingAs($user)->deleteJson('/api/v1/campaigns/'.$campaign->id, ['confirmation' => true])->assertNoContent();
    foreach ([$campaign, $link, $click] as $model) {
        $this->assertModelMissing($model);
    }
    $this->assertModelExists($project);
});

it('validates resource mutations and requires literal confirmation', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $this->actingAs($user)->postJson('/api/v1/projects', [])->assertBadRequest()->assertJsonValidationErrors(['clientName', 'description']);
    $this->postJson('/api/v1/campaigns', ['project_id' => $project->id, 'title' => 'Title', 'url' => 'javascript:alert(1)'])->assertBadRequest()->assertJsonValidationErrors('url');
    $this->postJson('/api/v1/campaigns/manual', [])->assertBadRequest()->assertJsonValidationErrors(['project_id', 'campaign_id', 'title']);
    $this->deleteJson('/api/v1/projects/'.$project->id, ['confirmation' => 'true'])->assertBadRequest();
    $this->getJson('/api/v1/projects/bad-id')->assertBadRequest();
    $this->assertModelExists($project);
});

it('blocks unauthenticated and incomplete users from domain endpoints', function () {
    $this->getJson('/api/v1/projects')->assertUnauthorized();
    $user = User::factory()->create(['onboardingStep' => 'socials']);
    $this->actingAs($user)->getJson('/api/v1/projects')->assertForbidden();
    $this->postJson('/api/v1/campaigns', [])->assertForbidden();
});

it('aggregates twelve human performance buckets with previous-window comparisons', function () {
    $this->travelTo(CarbonImmutable::parse('2026-09-19T12:00:00Z'));
    $user = User::factory()->create();
    $project = Project::factory()->create(['owner' => $user->id]);
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $link = Link::factory()->create(['project' => $project->id, 'campaign' => $campaign->id]);
    $empty = Link::factory()->create(['project' => $project->id, 'campaign' => $campaign->id]);
    Click::factory()->count(2)->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id, 'clickedAt' => now()->subHour()]);
    Click::factory()->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id, 'clickedAt' => now()->subHours(24)]);
    Click::factory()->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id, 'clickedAt' => now()->subHours(48)]);
    Click::factory()->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id, 'clickedAt' => now()]);
    Click::factory()->create(['link' => $link->id, 'project' => $project->id, 'campaign' => $campaign->id, 'clickedAt' => now()->subHour(), 'isBot' => true]);

    $this->actingAs($user)->getJson('/api/v1/campaigns/'.$campaign->id.'/performance?window=24h')
        ->assertOk()->assertJsonPath('data.start', '2026-09-18T12:00:00.000Z')
        ->assertJsonPath('data.bucketMs', 7200000)->assertJsonPath('data.links.0.performance.clicks', 3)
        ->assertJsonPath('data.links.0.performance.previousClicks', 1)
        ->assertJsonPath('data.links.0.performance.changePercent', 200)
        ->assertJsonPath('data.links.0.performance.sharePercent', 100)
        ->assertJsonPath('data.links.0.performance.trend', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2])
        ->assertJsonPath('data.links.1.performance.clicks', 0)
        ->assertJsonPath('data.links.1.performance.changePercent', null);
    $this->getJson('/api/v1/campaigns/'.$campaign->id.'/performance?window=bad')->assertBadRequest();
});

it('uses the old not-found messages without exposing model details', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $campaign = Campaign::factory()->create(['project' => $project->id]);
    $orphan = DB::connection('mongodb')->getCollection('campaigns')->insertOne([
        'title' => 'Orphan', 'url' => 'https://example.com', 'createdAt' => new UTCDateTime, 'updatedAt' => new UTCDateTime,
    ])->getInsertedId();
    $this->actingAs($user);

    $this->getJson('/api/v1/projects/'.$project->id)->assertNotFound()->assertJsonPath('message', 'Project not found.');
    $this->getJson('/api/v1/campaigns/'.$campaign->id)->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->getJson('/api/v1/campaigns/'.$orphan)->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->getJson('/api/v1/campaigns/'.new ObjectId)->assertNotFound()->assertJsonPath('message', 'Campaign not found.');
    $this->getJson('/api/v1/campaigns/not-an-id')->assertBadRequest();
});

it('generates slugs that no existing link uses', function () {
    $taken = str_split(substr(SlugGenerator::CHARACTERS, 1));
    foreach ($taken as $slug) {
        Link::factory()->create(['slug' => $slug]);
    }

    expect(app(SlugGenerator::class)->generate(1))->toBe('a');
    expect(app(SlugGenerator::class)->isAvailable('b'))->toBeFalse();
});
