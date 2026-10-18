<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

class SponsorReportUpdateRequest extends SponsorReportStoreRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:120'],
            ...self::sectionRules(),
            'expires_at' => ['sometimes', 'nullable', 'date', 'after:now'],
            'revoked' => ['sometimes', 'boolean'],
            'regenerate_token' => ['sometimes', 'boolean'],
        ];
    }
}
