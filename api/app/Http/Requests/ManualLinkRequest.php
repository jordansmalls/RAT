<?php

namespace App\Http\Requests;

class ManualLinkRequest extends RatRequest
{
    public function rules(): array
    {
        return [
            'project_id' => ['required', 'string', 'regex:/^[a-f0-9]{24}$/i'], 'campaign_id' => ['required', 'string', 'regex:/^[a-f0-9]{24}$/i'], 'title' => ['required', 'string'],
        ];
    }
}
