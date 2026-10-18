<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsOverview;
use App\Services\Analytics\ProjectAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Dashboard overview across the user's projects (`?window=24h|7d|30d`, default 30d, plus
 * optional `projectId`, `campaignId` and `linkId` scopes).
 */
class OverviewController extends Controller
{
    public function __invoke(Request $request, AnalyticsOverview $overview): JsonResponse
    {
        $owner = ProjectAccess::userObjectId($request->user())
            ?? throw ProjectAccess::failure(404, 'Project not found.');

        return response()->json(
            ['data' => $overview->forUser($owner, $request->query->all())],
            options: JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
    }
}
