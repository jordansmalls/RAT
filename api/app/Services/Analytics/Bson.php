<?php

namespace App\Services\Analytics;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use MongoDB\BSON\Decimal128;
use MongoDB\BSON\Int64;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Model\BSONArray;
use MongoDB\Model\BSONDocument;
use stdClass;

/**
 * Converts raw driver results into the JSON the old Express API produced: ObjectIds become
 * hex strings, dates become `Date#toJSON()` strings (ISO-8601 UTC with milliseconds), and
 * key order is preserved. Empty embedded documents stay objects (`{}`), not `[]`.
 * Plain PHP arrays built by this app are normalized element by element.
 */
class Bson
{
    /**
     * Normalize a BSON value (and anything nested in it) for JSON output.
     */
    public static function normalize(mixed $value): mixed
    {
        return match (true) {
            $value instanceof ObjectId => (string) $value,
            $value instanceof UTCDateTime => self::isoDate($value),
            $value instanceof DateTimeInterface => self::isoDate($value),
            $value instanceof Int64 => (int) (string) $value,
            $value instanceof Decimal128 => (float) (string) $value,
            $value instanceof BSONArray => array_map(self::normalize(...), array_values($value->getArrayCopy())),
            $value instanceof BSONDocument, $value instanceof stdClass => self::normalizeDocument((array) ($value instanceof BSONDocument ? $value->getArrayCopy() : $value)),
            is_array($value) => array_map(self::normalize(...), $value),
            is_float($value) && $value == 0.0 => 0.0,
            default => $value,
        };
    }

    /**
     * Format a date like JavaScript's `Date#toISOString()`.
     */
    public static function isoDate(UTCDateTime|DateTimeInterface|int $date): string
    {
        $dateTime = match (true) {
            $date instanceof UTCDateTime => $date->toDateTime(),
            is_int($date) => (new UTCDateTime($date))->toDateTime(),
            default => DateTimeImmutable::createFromInterface($date),
        };

        return $dateTime->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
    }

    /**
     * Normalize an associative document, keeping empty documents as JSON objects.
     *
     * @param  array<string, mixed>  $document
     * @return array<string, mixed>|stdClass
     */
    protected static function normalizeDocument(array $document): array|stdClass
    {
        if ($document === []) {
            return new stdClass;
        }

        return array_map(self::normalize(...), $document);
    }
}
