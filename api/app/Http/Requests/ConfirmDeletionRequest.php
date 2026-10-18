<?php

namespace App\Http\Requests;

class ConfirmDeletionRequest extends RatRequest
{
    public function rules(): array
    {
        return [
            'confirmation' => ['required', function (string $attribute, mixed $value, \Closure $fail): void {
                if ($value !== true) {
                    $fail('You must confirm deletion!');
                }
            }],
        ];
    }
}
