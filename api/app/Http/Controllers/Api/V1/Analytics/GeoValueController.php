<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Services\Analytics\GeoValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Geo value score for a project, optionally scoped by `?linkId=` and `?campaignId=`.
 *
 * Counts human clicks only and values them by country tier. See {@see GeoValue} for the
 * formula.
 */
class GeoValueController extends ProjectScopedController
{
    public function __construct(protected GeoValue $geoValue) {}

    public function __invoke(Request $request, string $projectId): JsonResponse
    {
        return $this->respond(
            'Geo value calculated',
            $this->geoValue->compute($this->clickScopeWithCampaign($request, $projectId)),
        );
    }
}
