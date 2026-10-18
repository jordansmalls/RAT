<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Support\Str;

/**
 * Trims and lowercases identifier fields (emails, usernames) before validation,
 * matching how they are stored on the user model.
 */
trait NormalizesIdentifiers
{
    /**
     * Normalize the given input keys when present as strings.
     *
     * @param  list<string>  $keys
     */
    protected function normalizeIdentifiers(array $keys): void
    {
        $normalized = [];

        foreach ($keys as $key) {
            $value = $this->input($key);

            if (is_string($value)) {
                $normalized[$key] = Str::lower(trim($value));
            }
        }

        $this->merge($normalized);
    }
}
