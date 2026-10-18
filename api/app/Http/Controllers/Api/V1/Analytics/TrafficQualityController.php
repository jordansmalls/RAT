<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Services\Analytics\TrafficQuality;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrafficQualityController extends ProjectScopedController
{
    public function __construct(protected TrafficQuality $quality) {}

    public function __invoke(Request $request, string $projectId): JsonResponse
    {
        $match = $this->clickScopeWithCampaign($request, $projectId);

        return $this->respond('Traffic quality calculated', $this->quality->compute($match));
    }
}
