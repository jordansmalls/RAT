<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Concerns\NormalizesIdentifiers;
use App\Models\User;
use App\Rules\UniqueUserIdentifier;
use App\Rules\Username;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUsernameRequest extends FormRequest
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
        $this->normalizeIdentifiers(['username']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => [
                'required',
                'string',
                new Username,
                Rule::notIn(config('usernames.reserved')),
                new UniqueUserIdentifier('handle', $this->user()->id),
            ],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'username.not_in' => 'This username is not available.',
            'username.unique' => 'This username has already been taken.',
        ];
    }
}
