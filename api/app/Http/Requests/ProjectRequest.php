<?php

namespace App\Http\Requests;

class ProjectRequest extends RatRequest
{
    public function rules(): array
    {
        return [
            'clientName' => ['required', 'string'], 'description' => ['required', 'string'],
        ];
    }
}
