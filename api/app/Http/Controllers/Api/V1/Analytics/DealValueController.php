<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Services\Analytics\ClickScope;
use App\Services\Analytics\Collections;
use App\Services\Analytics\DealValue;
use App\Services\Analytics\ProjectAccess;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use MongoDB\BSON\ObjectId;

/**
 * `GET /api/v1/analytics/campaign/{campaignId}/deal-value`.
 *
 * The campaign is resolved from the raw `campaigns` collection, then its project is checked for
 * ownership, so another user's campaign is a 404 "Campaign not found." (never a 403) and a
 * malformed id is a 400. A campaign with no stored deal is a 422.
 */
class DealValueController extends ProjectScopedController
{
    public const INVALID_CAMPAIGN_MESSAGE = 'Use a valid campaign ID.';

    public const NOT_FOUND_MESSAGE = 'Campaign not found.';

    public const NO_DEAL_MESSAGE = 'This campaign has no deal value yet.';

    protected const ARRAY_TYPE_MAP = ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']];

    public function __construct(protected DealValue $dealValue) {}

    public function __invoke(Request $request, string $campaignId): JsonResponse
    {
        if (! ClickScope::isStrictObjectIdString($campaignId)) {
            throw ProjectAccess::failure(400, self::INVALID_CAMPAIGN_MESSAGE);
        }

        $campaign = Collections::campaigns()->findOne(['_id' => new ObjectId($campaignId)], self::ARRAY_TYPE_MAP);

        if ($campaign === null || ! ($campaign['project'] ?? null) instanceof ObjectId) {
            throw ProjectAccess::failure(404, self::NOT_FOUND_MESSAGE);
        }

        try {
            $project = ProjectAccess::ownedProject((string) $campaign['project'], $request->user());
        } catch (HttpResponseException $error) {
            if ($error->getResponse()->getStatusCode() === 404) {
                throw ProjectAccess::failure(404, self::NOT_FOUND_MESSAGE);
            }

            throw $error;
        }

        $deal = $campaign['deal'] ?? null;

        if (! is_array($deal) || ! isset($deal['amount'])) {
            throw ProjectAccess::failure(422, self::NO_DEAL_MESSAGE);
        }

        return $this->respond('Deal value calculated', $this->dealValue->compute([
            'project' => $project,
            'campaign' => $campaign['_id'],
        ], $deal));
    }
}
