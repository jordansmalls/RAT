<?php

namespace App\Http\Resources;

use App\Models\Campaign;
use App\Models\SponsorReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Owner-facing view of a sponsor report. Never includes `tokenHash`; the plaintext token and
 * share URL appear only when the token was just created or regenerated ({@see withToken()}).
 *
 * @mixin SponsorReport
 */
class SponsorReportResource extends JsonResource
{
    protected ?string $plainToken = null;

    public function withToken(string $token): static
    {
        $this->plainToken = $token;

        return $this;
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SponsorReport $report */
        $report = $this->resource;
        $campaign = $report->relationLoaded('campaignModel') ? $report->getRelation('campaignModel') : null;
        $attributes = $report->getAttributes();

        return [
            '_id' => (string) $report->getKey(),
            'project' => (string) $report->project,
            'campaign' => (string) $report->campaign,
            'campaignTitle' => $campaign instanceof Campaign ? $campaign->title : null,
            'title' => $report->title,
            'sections' => $report->resolvedSections(),
            'status' => $report->status(),
            'expiresAt' => RatResource::serialize($report->expiresAt),
            'revokedAt' => RatResource::serialize($report->revokedAt),
            'viewCount' => (int) ($attributes['viewCount'] ?? 0),
            'lastViewedAt' => RatResource::serialize($report->lastViewedAt),
            'createdAt' => RatResource::serialize($report->createdAt),
            'updatedAt' => RatResource::serialize($report->updatedAt),
            ...($this->plainToken === null ? [] : [
                'token' => $this->plainToken,
                'shareUrl' => SponsorReport::shareUrl($this->plainToken),
            ]),
        ];
    }
}
