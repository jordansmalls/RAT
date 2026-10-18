<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SponsorReportStoreRequest;
use App\Http\Requests\SponsorReportUpdateRequest;
use App\Http\Resources\RatResource;
use App\Http\Resources\SponsorReportResource;
use App\Models\Campaign;
use App\Models\SponsorReport;
use App\Services\SponsorReports\ReportBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use MongoDB\BSON\ObjectId;

/**
 * Owner CRUD for shareable sponsor reports. Reports that aren't the user's are 404.
 */
class SponsorReportController extends Controller
{
    public function index(Request $request): RatResource
    {
        $query = SponsorReport::where('owner', new ObjectId($request->user()->id));
        if ($request->query->has('campaign_id')) {
            $campaignId = $request->query('campaign_id');
            abort_unless(ProjectController::isObjectId($campaignId), 400, 'Invalid campaign_id format.');
            $query->where('campaign', new ObjectId($campaignId));
        }
        $reports = $this->withCampaigns($query->orderBy('createdAt', 'desc')->get());

        return new RatResource([
            'message' => $reports->count().' sponsor reports found.',
            'reports' => SponsorReportResource::collection($reports)->resolve($request),
        ]);
    }

    public function store(SponsorReportStoreRequest $request): JsonResponse
    {
        $campaign = CampaignController::owned($request, $request->validated('campaign_id'));
        $token = SponsorReport::generateToken();
        $report = SponsorReport::create([
            'owner' => $request->user()->id,
            'project' => $campaign->project,
            'campaign' => $campaign->id,
            'title' => $request->validated('title') ?: $campaign->title,
            'tokenHash' => SponsorReport::hashToken($token),
            'sections' => [...SponsorReport::DEFAULT_SECTIONS, ...$request->sectionToggles()],
            'expiresAt' => $request->validated('expires_at'),
        ]);
        $report->setRelation('campaignModel', $campaign);

        return (new RatResource([
            'message' => 'Sponsor report created.',
            'report' => (new SponsorReportResource($report))->withToken($token)->resolve($request),
        ]))->response()->setStatusCode(201);
    }

    /**
     * Pass `?preview=1` to also get the public payload, since the owner can't recover the token.
     */
    public function show(Request $request, string $report, ReportBuilder $builder): RatResource
    {
        $model = $this->withCampaigns(collect([self::owned($request, $report)]))->first();
        $campaign = $model->getRelation('campaignModel');

        return new RatResource([
            'message' => 'Sponsor report found.',
            'report' => (new SponsorReportResource($model))->resolve($request),
            ...($request->boolean('preview') && $campaign instanceof Campaign ? ['payload' => $builder->build($model, $campaign)] : []),
        ]);
    }

    public function update(SponsorReportUpdateRequest $request, string $report): RatResource
    {
        $model = self::owned($request, $report);
        $changes = $request->safe()->only(['title']);
        if ($request->has('sections')) {
            $changes['sections'] = [...$model->resolvedSections(), ...$request->sectionToggles()];
        }
        if ($request->exists('expires_at')) {
            $changes['expiresAt'] = $request->validated('expires_at');
        }
        if ($request->has('revoked')) {
            $changes['revokedAt'] = $request->boolean('revoked') ? ($model->revokedAt ?? now()) : null;
        }
        $token = null;
        if ($request->boolean('regenerate_token')) {
            $token = SponsorReport::generateToken();
            $changes['tokenHash'] = SponsorReport::hashToken($token);
        }
        $model->fill($changes);
        $model->save();
        $model = $this->withCampaigns(collect([$model]))->first();

        $resource = new SponsorReportResource($model);

        return new RatResource([
            'message' => $token === null ? 'Sponsor report updated.' : 'Sponsor report link regenerated.',
            'report' => ($token === null ? $resource : $resource->withToken($token))->resolve($request),
        ]);
    }

    public function destroy(Request $request, string $report): Response
    {
        self::owned($request, $report)->delete();

        return response()->noContent();
    }

    /**
     * Find a sponsor report the signed-in user owns. Malformed ids are 400, anything else 404.
     */
    public static function owned(Request $request, string $id): SponsorReport
    {
        abort_unless(ProjectController::isObjectId($id), 400, 'Invalid sponsor report id.');

        return SponsorReport::whereKey($id)->where('owner', new ObjectId($request->user()->id))->first()
            ?? abort(404, 'Sponsor report not found.');
    }

    /**
     * Attach each report's campaign (when it still exists) for `campaignTitle`.
     *
     * @param  Collection<int, SponsorReport>  $reports
     * @return Collection<int, SponsorReport>
     */
    private function withCampaigns(Collection $reports): Collection
    {
        $ids = $reports->map(fn (SponsorReport $report) => new ObjectId((string) $report->campaign))->unique()->values()->all();
        $campaigns = $ids === [] ? collect() : Campaign::whereIn('_id', $ids)->get()->keyBy(fn (Campaign $campaign) => (string) $campaign->getKey());

        return $reports->each(fn (SponsorReport $report) => $report->setRelation('campaignModel', $campaigns->get((string) $report->campaign)));
    }
}
