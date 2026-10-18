<?php

namespace App\Http\Requests;

class CampaignRequest extends RatRequest
{
    public function rules(): array
    {
        return [
            'project_id' => [$this->isMethod('POST') ? 'required' : 'exclude', 'string', 'regex:/^[a-f0-9]{24}$/i'], 'title' => ['required', 'string'], 'url' => ['required', 'string', 'url:http,https'],
        ];
    }
}
