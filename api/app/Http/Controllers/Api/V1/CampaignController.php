<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CampaignPerformanceRequest;
use App\Http\Requests\CampaignRequest;
use App\Http\Requests\ConfirmDeletionRequest;
use App\Http\Requests\ManualLinkRequest;
use App\Http\Resources\RatResource;
use App\Models\Campaign;
use App\Models\Click;
use App\Models\Link;
use App\Models\Project;
use App\Services\LinkPerformance;
use App\Services\SlugGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use MongoDB\BSON\ObjectId;
use MongoDB\Driver\Exception\BulkWriteException;

class CampaignController extends Controller
{
    public function __construct(private SlugGenerator $slugs) {}

    public function index(Request $request): RatResource
    {
        $projectIds = Project::where('owner', new ObjectId($request->user()->id))->pluck('id')->map(fn ($id) => new ObjectId((string) $id))->all();
        $campaigns = Campaign::whereIn('project', $projectIds)->get();
        abort_if($campaigns->isEmpty(), 404, 'No campaigns found.');

        return new RatResource(['message' => $campaigns->count().' campaigns found.', 'campaigns' => $campaigns]);
    }

    public function store(CampaignRequest $request): JsonResponse
    {
        $project = ProjectController::owned($request, $request->validated('project_id'));
        $campaign = Campaign::create(['project' => $project->id, ...$request->safe()->only(['title', 'url'])]);
        try {
            foreach (array_diff(Link::PLATFORMS, ['other']) as $platform) {
                $this->makeLink($campaign, $platform, $platform);
            }
        } catch (\Throwable $error) {
            Link::where('campaign', new ObjectId($campaign->id))->delete();
            $campaign->delete();
            throw $error;
        }
        $links = Link::where('campaign', new ObjectId($campaign->id))->get();

        return (new RatResource(['message' => 'Campaign successfully created!', 'campaign' => $campaign, 'links' => $links]))->response()->setStatusCode(201);
    }

    public function manual(ManualLinkRequest $request): JsonResponse
    {
        ProjectController::owned($request, $request->validated('project_id'));
        $campaign = self::owned($request, $request->validated('campaign_id'));
        $link = $this->makeLink($campaign, $request->validated('title'), 'other');

        return (new RatResource(['message' => 'Successfully created the "'.$link->title.'" link.', 'link' => $link]))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $campaign): RatResource
    {
        return new RatResource(self::owned($request, $campaign));
    }

    public function update(CampaignRequest $request, string $campaign): RatResource
    {
        $model = self::owned($request, $campaign);
        $model->update($request->safe()->only(['title', 'url']));
        Link::where('campaign', new ObjectId($model->id))->where('project', new ObjectId($model->project))->update(['destinationUrl' => $model->url]);

        return new RatResource(['message' => 'Campaign updated successfully!', 'campaign' => $model]);
    }

    public function destroy(ConfirmDeletionRequest $request, string $campaign): Response
    {
        $model = self::owned($request, $campaign);
        $scope = ['campaign' => new ObjectId($model->id), 'project' => new ObjectId($model->project)];
        Click::where($scope)->delete();
        Link::where($scope)->delete();
        $model->delete();

        return response()->noContent();
    }

    public function links(Request $request, string $campaign): RatResource
    {
        $model = self::owned($request, $campaign);
        $links = Link::where('campaign', new ObjectId($model->id))->get();

        return new RatResource(['message' => $links->count().' links found for this campaign.', 'links' => $links]);
    }

    public function performance(CampaignPerformanceRequest $request, string $campaign, LinkPerformance $performance): RatResource
    {
        return new RatResource($performance->summarize(self::owned($request, $campaign), $request->validated('window', '24h')));
    }

    /**
     * Find a campaign whose project the signed-in user owns. Anything else is 404.
     */
    public static function owned(Request $request, string $id): Campaign
    {
        abort_unless(ProjectController::isObjectId($id), 400, 'Invalid credentials: invalid campaign_id format');
        $campaign = Campaign::find($id);
        $ownsProject = $campaign !== null && ProjectController::isObjectId($campaign->project)
            && Project::whereKey($campaign->project)->where('owner', new ObjectId($request->user()->id))->exists();
        abort_unless($ownsProject, 404, 'Campaign not found.');

        return $campaign;
    }

    /**
     * Create a short link on the campaign. The unique slug index settles races between
     * the availability check and the insert, so a duplicate key is retried with a new slug.
     */
    private function makeLink(Campaign $campaign, string $title, string $platform): Link
    {
        for ($attempt = 1; ; $attempt++) {
            $slug = $this->slugs->generate(4);
            try {
                return Link::create([
                    'project' => $campaign->project, 'campaign' => $campaign->id,
                    'title' => $title, 'platform' => $platform, 'slug' => $slug,
                    'destinationUrl' => $campaign->url, 'customUrl' => rtrim(config('rat.base_url'), '/').'/'.$slug,
                ]);
            } catch (BulkWriteException $error) {
                if ($error->getCode() !== 11000 || $attempt >= 10) {
                    throw $error;
                }
            }
        }
    }
}
