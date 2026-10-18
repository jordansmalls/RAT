<?php

namespace App\Services;

use App\Models\Link;

/**
 * Port of the old server's utils/generate.slug.js: random lowercase alphanumeric
 * slugs, regenerated until no link uses them.
 */
class SlugGenerator
{
    public const CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789';

    public function generate(int $length = 4): string
    {
        do {
            $slug = '';
            for ($index = 0; $index < $length; $index++) {
                $slug .= self::CHARACTERS[random_int(0, strlen(self::CHARACTERS) - 1)];
            }
        } while (! $this->isAvailable($slug));

        return $slug;
    }

    public function isAvailable(string $slug): bool
    {
        return ! Link::where('slug', $slug)->exists();
    }
}
