<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CampaignDealRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A deal is a positive amount in one supported currency, an optional benchmark
     * category (null means the config `default` set) and an optional payment date.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'gt:0', 'max:10000000'],
            'currency' => ['required', 'string', Rule::in(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])],
            'category' => ['nullable', 'string', Rule::in(array_keys(config('sponsor.deal_value.benchmarks')))],
            'paid_at' => ['nullable', 'date'],
        ];
    }
}
