<?php

namespace App\Http\Requests;

class CampaignPerformanceRequest extends RatRequest
{
    public function rules(): array
    {
        return [
            'window' => ['sometimes', 'string', 'in:24h,7d,30d'],
        ];
    }
}
