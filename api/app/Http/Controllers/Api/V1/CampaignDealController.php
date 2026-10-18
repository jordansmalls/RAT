<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CampaignDealRequest;
use App\Http\Resources\RatResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use MongoDB\BSON\UTCDateTime;

/**
 * Sponsor deal stored on a campaign as the `deal` sub-document:
 * `{ amount: float, currency: string, category: string|null, paidAt: UTCDateTime|null }`.
 *
 * Ownership goes through {@see CampaignController::owned()}, so another user's campaign
 * (or an unknown/malformed id) is a 404/400 exactly like the rest of the campaign routes.
 */
class CampaignDealController extends Controller
{
    public function update(CampaignDealRequest $request, string $campaign): RatResource
    {
        $model = CampaignController::owned($request, $campaign);
        $paidAt = $request->validated('paid_at');

        $model->update(['deal' => [
            'amount' => (float) $request->validated('amount'),
            'currency' => $request->validated('currency'),
            'category' => $request->validated('category'),
            'paidAt' => $paidAt === null ? null : new UTCDateTime(new \DateTimeImmutable($paidAt)),
        ]]);

        return new RatResource(['message' => 'Deal saved.', 'campaign' => $model]);
    }

    public function destroy(Request $request, string $campaign): Response
    {
        $model = CampaignController::owned($request, $campaign);
        $model->unset('deal');
        $model->save();

        return response()->noContent();
    }
}
