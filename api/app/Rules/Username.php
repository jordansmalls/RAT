<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Validates username format only. Reserved names and uniqueness are checked separately.
 */
class Username implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute must be a string.');

            return;
        }

        $min = config('usernames.min_length');
        $max = config('usernames.max_length');

        if (mb_strlen($value) < $min || mb_strlen($value) > $max) {
            $fail("The :attribute must be between {$min} and {$max} characters.");

            return;
        }

        if (preg_match(config('usernames.pattern'), $value) !== 1) {
            $fail('The :attribute must start with a letter, end with a letter or number, and may only contain letters, numbers and single underscores.');
        }
    }
}
