<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmDeletionRequest;
use App\Http\Requests\ProjectRequest;
use App\Http\Resources\RatResource;
use App\Models\Campaign;
use App\Models\Click;
use App\Models\Link;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\BSON\ObjectId;

class ProjectController extends Controller
{
    public function index(Request $request): RatResource
    {
        $projects = Project::where('owner', new ObjectId($request->user()->id))->orderByDesc('createdAt')->get();
        abort_if($projects->isEmpty(), 404, 'No projects found.');

        return new RatResource(['message' => $projects->count().' projects found.', 'projects' => $projects]);
    }

    public function store(ProjectRequest $request): JsonResponse
    {
        $project = Project::create([...$request->validated(), 'owner' => $request->user()->id]);

        return (new RatResource(['message' => 'Project creation successful!', 'project' => $project]))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $project): RatResource
    {
        return new RatResource(['project' => self::owned($request, $project)]);
    }

    public function update(ProjectRequest $request, string $project): RatResource
    {
        $model = self::owned($request, $project);
        $model->update($request->validated());

        return new RatResource(['message' => 'Project updated successfully.', 'project' => $model]);
    }

    public function destroy(ConfirmDeletionRequest $request, string $project): RatResource
    {
        $model = self::owned($request, $project);
        $campaignIds = Campaign::where('project', new ObjectId($model->id))->pluck('id')->map(fn ($id) => new ObjectId((string) $id))->all();
        $links = Link::whereIn('campaign', $campaignIds);
        $linkIds = $links->pluck('id')->map(fn ($id) => new ObjectId((string) $id))->all();
        Click::whereIn('link', $linkIds)->delete();
        $links->delete();
        Campaign::where('project', new ObjectId($model->id))->delete();
        $model->delete();

        return new RatResource(['message' => 'Project and all related data deleted successfully']);
    }

    public function campaigns(Request $request, string $project): RatResource
    {
        $model = self::owned($request, $project);
        $campaigns = Campaign::where('project', new ObjectId($model->id))->orderByDesc('createdAt')->get();
        abort_if($campaigns->isEmpty(), 404, 'No campaigns found.');
        $counts = Link::raw(fn ($collection) => $collection->aggregate([
            ['$match' => ['project' => new ObjectId($model->id)]],
            ['$group' => ['_id' => '$campaign', 'count' => ['$sum' => 1]]],
        ]));
        $byCampaign = [];
        foreach ($counts as $row) {
            $byCampaign[(string) $row['_id']] = $row['count'];
        }
        foreach ($campaigns as $campaign) {
            $campaign->linkCount = $byCampaign[$campaign->id] ?? 0;
        }

        return new RatResource(['message' => $campaigns->count().' campaigns found for this project.', 'campaigns' => $campaigns]);
    }

    /**
     * Find a project owned by the signed-in user. Other users' projects are 404, like missing ones.
     */
    public static function owned(Request $request, string $id): Project
    {
        abort_unless(self::isObjectId($id), 400, 'Invalid credentials: invalid project_id');

        return Project::whereKey($id)->where('owner', new ObjectId($request->user()->id))->first()
            ?? abort(404, 'Project not found.');
    }

    public static function isObjectId(mixed $id): bool
    {
        return is_string($id) && preg_match('/^[a-f0-9]{24}$/i', $id) === 1;
    }
}
