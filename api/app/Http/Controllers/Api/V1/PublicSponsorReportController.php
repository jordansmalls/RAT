<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Project;
use App\Models\SponsorReport;
use App\Services\SponsorReports\ReportBuilder;
use Illuminate\Http\JsonResponse;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * Public, unauthenticated sponsor report: `GET /api/v1/public/reports/{token}`.
 *
 * The token is hashed and looked up by `tokenHash`. Unknown, revoked and expired tokens (and
 * reports whose campaign is gone) all get the same 404 body, so tokens can't be probed.
 * Every response is `no-store` and `noindex`.
 */
class PublicSponsorReportController extends Controller
{
    public const NOT_FOUND_MESSAGE = 'Report not found.';

    public function __invoke(string $token, ReportBuilder $builder): JsonResponse
    {
        $report = $this->liveReport($token);
        $campaign = $report === null ? null : $this->campaignFor($report);

        if ($report === null || $campaign === null) {
            return $this->withPrivateHeaders(response()->json(['message' => self::NOT_FOUND_MESSAGE], 404));
        }

        $payload = $builder->cached($report, $campaign);

        SponsorReport::raw(fn ($collection) => $collection->updateOne(
            ['_id' => new ObjectId((string) $report->getKey())],
            ['$inc' => ['viewCount' => 1], '$set' => ['lastViewedAt' => new UTCDateTime]],
        ));

        return $this->withPrivateHeaders(response()->json(['data' => $payload]));
    }

    private function liveReport(string $token): ?SponsorReport
    {
        if (preg_match('/^[A-Za-z0-9]{20,128}$/', $token) !== 1) {
            return null;
        }

        $report = SponsorReport::where('tokenHash', SponsorReport::hashToken($token))->first();

        return $report !== null && $report->status() === 'active' ? $report : null;
    }

    /**
     * The report's campaign, only while it still belongs to a project the report owner owns.
     */
    private function campaignFor(SponsorReport $report): ?Campaign
    {
        $campaign = Campaign::find((string) $report->campaign);
        $stillOwned = $campaign !== null && (string) $campaign->project === (string) $report->project
            && Project::whereKey((string) $report->project)->where('owner', new ObjectId((string) $report->owner))->exists();

        return $stillOwned ? $campaign : null;
    }

    private function withPrivateHeaders(JsonResponse $response): JsonResponse
    {
        $response->headers->set('Cache-Control', 'no-store, private');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        return $response;
    }
}
