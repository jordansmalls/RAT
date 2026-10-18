<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Port of the old `utils/analytics-match.js` (the shared A1 contract).
 *
 * Builds the `$match` every click aggregation starts from: a project ObjectId plus an
 * optional link ObjectId. External IDs must be scalar strings of exactly 24 hex characters.
 * Only an absent `linkId` means "no link filter"; an explicitly supplied empty, null,
 * malformed or non-scalar value is invalid, so the caller returns a 400 before any database work.
 */
class ClickScope
{
    /**
     * Whether a value is a strict 24-hex ObjectId string.
     */
    public static function isStrictObjectIdString(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[0-9a-fA-F]{24}$/D', $value) === 1;
    }

    /**
     * Build a click match from external IDs, or null when any supplied ID is invalid.
     *
     * @param  bool  $hasLinkId  Whether the `linkId` key was supplied at all.
     * @return array{project: ObjectId, link?: ObjectId}|null
     */
    public static function build(mixed $projectId, bool $hasLinkId = false, mixed $linkId = null): ?array
    {
        if (! self::isStrictObjectIdString($projectId)) {
            return null;
        }

        $match = ['project' => new ObjectId($projectId)];

        if (! $hasLinkId) {
            return $match;
        }

        if (! self::isStrictObjectIdString($linkId)) {
            return null;
        }

        $match['link'] = new ObjectId($linkId);

        return $match;
    }

    /**
     * Build a click match for a project from request query parameters (`linkId`).
     *
     * Laravel's ConvertEmptyStringsToNull turns `?linkId=` into null; the key is still present,
     * so it is rejected just like the old explicit empty string.
     *
     * @param  array<string, mixed>  $query
     * @return array{project: ObjectId, link?: ObjectId}|null
     */
    public static function fromQuery(ObjectId $project, array $query): ?array
    {
        return self::build((string) $project, array_key_exists('linkId', $query), $query['linkId'] ?? null);
    }
}
