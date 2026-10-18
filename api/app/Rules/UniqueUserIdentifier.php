<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniqueUserIdentifier implements ValidationRule
{
    public function __construct(private string $column, private ?string $ignoreId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $query = User::query()->where($this->column, $value);
        if ($this->ignoreId !== null) {
            $query->whereKeyNot($this->ignoreId);
        }
        if ($query->exists()) {
            $fail($attribute === 'username' ? 'This username has already been taken.' : 'The email has already been taken.');
        }
    }
}
