<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Services\Analytics\DecayCurve;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * `GET /api/v1/analytics/project/{projectId}/decay[?linkId|campaignId][&days=90]`.
 *
 * Ownership is resolved first (400 malformed id, 404 not owned), then `days` is validated as an
 * integer between 7 and 365 (422 otherwise). An omitted `days` uses `config('sponsor.decay.default_days')`.
 * The curve maths lives in {@see DecayCurve}.
 */
class DecayCurveController extends ProjectScopedController
{
    public function __construct(protected DecayCurve $decay) {}

    public function __invoke(Request $request, string $projectId): JsonResponse
    {
        $match = $this->clickScopeWithCampaign($request, $projectId);

        $validated = $request->validate([
            'days' => ['sometimes', 'integer', 'min:7', 'max:365'],
        ]);

        $days = (int) ($validated['days'] ?? config('sponsor.decay.default_days', 90));

        return $this->respond('Decay curve calculated', $this->decay->compute($match, $days));
    }
}
