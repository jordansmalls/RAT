<?php

namespace App\Http\Requests;

use App\Models\SponsorReport;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SponsorReportStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'campaign_id' => ['required', 'string', 'regex:/^[a-f0-9]{24}$/i'],
            'title' => ['sometimes', 'nullable', 'string', 'max:120'],
            ...self::sectionRules(),
            'expires_at' => ['sometimes', 'nullable', 'date', 'after:now'],
        ];
    }

    /**
     * Rules for the `sections` map: only known keys, boolean values.
     *
     * @return array<string, array<mixed>>
     */
    public static function sectionRules(): array
    {
        return [
            'sections' => ['sometimes', 'array:'.implode(',', array_keys(SponsorReport::DEFAULT_SECTIONS))],
            'sections.*' => ['boolean'],
        ];
    }

    /**
     * Validated section toggles as booleans.
     *
     * @return array<string, bool>
     */
    public function sectionToggles(): array
    {
        return array_map(fn (mixed $value): bool => filter_var($value, FILTER_VALIDATE_BOOLEAN), (array) $this->validated('sections', []));
    }
}
