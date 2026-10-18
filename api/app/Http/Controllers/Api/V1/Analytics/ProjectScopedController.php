<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Http\Controllers\Controller;
use App\Services\Analytics\ClickScope;
use App\Services\Analytics\Collections;
use App\Services\Analytics\ProjectAccess;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\BSON\ObjectId;

/**
 * Base for `/analytics/project/{projectId}/*` endpoints.
 *
 * Applies the old two-step guard in order: project ownership (400 "Use a valid project ID.",
 * 404 "Project not found."), then the optional `linkId` filter
 * (400 "A valid project ID is required", the old handlers' message).
 */
abstract class ProjectScopedController extends Controller
{
    public const INVALID_SCOPE_MESSAGE = 'A valid project ID is required';

    /**
     * Resolve the owned project and the click match for this request.
     *
     * @return array{project: ObjectId, link?: ObjectId}
     *
     * @throws HttpResponseException
     */
    protected function clickScope(Request $request, string $projectId): array
    {
        $project = ProjectAccess::ownedProject($projectId, $request->user());

        return ClickScope::fromQuery($project, $request->query->all())
            ?? throw ProjectAccess::failure(400, self::INVALID_SCOPE_MESSAGE);
    }

    /**
     * Like {@see ClickScope()}, plus an optional `?campaignId=` filter. The campaign must belong
     * to the project (404 "Campaign not found." otherwise); a malformed value is a 400.
     *
     * @return array{project: ObjectId, link?: ObjectId, campaign?: ObjectId}
     *
     * @throws HttpResponseException
     */
    protected function clickScopeWithCampaign(Request $request, string $projectId): array
    {
        $match = $this->clickScope($request, $projectId);

        if (! $request->query->has('campaignId')) {
            return $match;
        }

        $campaignId = $request->query('campaignId');

        if (! ClickScope::isStrictObjectIdString($campaignId)) {
            throw ProjectAccess::failure(400, self::INVALID_SCOPE_MESSAGE);
        }

        $campaign = new ObjectId($campaignId);
        $belongs = Collections::campaigns()->countDocuments(['_id' => $campaign, 'project' => $match['project']], ['limit' => 1]) > 0;

        if (! $belongs) {
            throw ProjectAccess::failure(404, 'Campaign not found.');
        }

        return [...$match, 'campaign' => $campaign];
    }

    /**
     * Wrap the old Express body in `{ data }`, with its `message` first.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function respond(string $message, array $payload): JsonResponse
    {
        return response()->json(
            ['data' => ['message' => $message, ...$payload]],
            options: JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
    }
}
