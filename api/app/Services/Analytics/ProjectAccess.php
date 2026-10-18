<?php

namespace App\Services\Analytics;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Exceptions\HttpResponseException;
use MongoDB\BSON\ObjectId;

/**
 * Port of the old `requireProjectAccess` middleware, using a raw query on `projects`.
 *
 * A malformed project ID is a 400; a project that does not exist or belongs to someone else
 * is a 404 (never a 403), so other users' project IDs are not disclosed.
 */
class ProjectAccess
{
    public const INVALID_PROJECT_MESSAGE = 'Use a valid project ID.';

    public const NOT_FOUND_MESSAGE = 'Project not found.';

    /**
     * Resolve a project the user owns, or abort with the old status and message.
     *
     * @throws HttpResponseException
     */
    public static function ownedProject(mixed $projectId, Authenticatable $user): ObjectId
    {
        if (! ClickScope::isStrictObjectIdString($projectId)) {
            throw self::failure(400, self::INVALID_PROJECT_MESSAGE);
        }

        $owner = self::userObjectId($user);
        $project = new ObjectId($projectId);

        if ($owner === null || ! self::owns($owner, $project)) {
            throw self::failure(404, self::NOT_FOUND_MESSAGE);
        }

        return $project;
    }

    /**
     * The authenticated user's `_id` as an ObjectId, or null when it is not one.
     */
    public static function userObjectId(Authenticatable $user): ?ObjectId
    {
        $identifier = $user->getAuthIdentifier();

        if ($identifier instanceof ObjectId) {
            return $identifier;
        }

        return ClickScope::isStrictObjectIdString($identifier) ? new ObjectId($identifier) : null;
    }

    /**
     * Build a JSON error response exception in Laravel's standard `{ message }` shape.
     */
    public static function failure(int $status, string $message): HttpResponseException
    {
        return new HttpResponseException(response()->json(['message' => $message], $status));
    }

    /**
     * Whether the owner has a project with this ID.
     */
    protected static function owns(ObjectId $owner, ObjectId $project): bool
    {
        return Collections::projects()->countDocuments(['_id' => $project, 'owner' => $owner], ['limit' => 1]) > 0;
    }
}
