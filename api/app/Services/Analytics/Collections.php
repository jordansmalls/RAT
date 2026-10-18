<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\DB;
use MongoDB\Collection;

/**
 * Raw MongoDB collections used by analytics. Analytics reads documents directly, so it
 * stays compatible with the stored BSON shapes and does not depend on Eloquent models.
 */
class Collections
{
    /**
     * A raw collection on the `mongodb` connection.
     */
    public static function get(string $name): Collection
    {
        return DB::connection('mongodb')->getCollection($name);
    }

    public static function clicks(): Collection
    {
        return self::get('clicks');
    }

    public static function projects(): Collection
    {
        return self::get('projects');
    }

    public static function campaigns(): Collection
    {
        return self::get('campaigns');
    }

    public static function links(): Collection
    {
        return self::get('links');
    }
}
