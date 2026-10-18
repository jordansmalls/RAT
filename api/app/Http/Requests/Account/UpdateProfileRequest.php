<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Concerns\NormalizesIdentifiers;
use App\Models\User;
use App\Rules\UniqueUserIdentifier;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Email;

class UpdateProfileRequest extends FormRequest
{
    use NormalizesIdentifiers;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->normalizeIdentifiers(['email']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Email::default(),
                new UniqueUserIdentifier('email', $this->user()->id),
            ],
        ];
    }
}
