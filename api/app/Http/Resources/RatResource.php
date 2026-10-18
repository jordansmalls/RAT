<?php

namespace App\Http\Resources;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class RatResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return self::serialize($this->resource);
    }

    public static function serialize(mixed $value): mixed
    {
        if ($value instanceof ObjectId) {
            return (string) $value;
        }
        if ($value instanceof UTCDateTime) {
            return $value->toDateTime()->format('Y-m-d\TH:i:s.v\Z');
        }
        if ($value instanceof DateTimeInterface) {
            return CarbonImmutable::instance($value)->utc()->format('Y-m-d\TH:i:s.v\Z');
        }
        if ($value instanceof Model) {
            $attributes = $value->getAttributes();
            foreach ($value->getHidden() as $hidden) {
                unset($attributes[$hidden]);
            }
            unset($attributes['__v']);
            $attributes['_id'] = (string) $value->getKey();
            unset($attributes['id']);

            return self::serialize($attributes);
        }
        if ($value instanceof \Traversable) {
            $value = iterator_to_array($value);
        } elseif ($value instanceof Arrayable) {
            $value = $value->toArray();
        }
        if (is_array($value)) {
            return array_map(self::serialize(...), $value);
        }

        return $value;
    }
}
