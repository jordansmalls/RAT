<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * {@see IpRetentionStore} over the raw `clicks` collection. The only write is `$unset: { ip }`;
 * click documents are never deleted.
 */
class MongoIpRetentionStore implements IpRetentionStore
{
    /**
     * The retention filter: strictly older than the cutoff (a click at the cutoff is kept) and
     * still holding a non-empty IP. It never matches on visitor identity.
     *
     * @return array<string, mixed>
     */
    public static function filter(int $cutoffMs, ObjectId|string|null $afterId = null): array
    {
        $filter = [
            'clickedAt' => ['$lt' => new UTCDateTime($cutoffMs)],
            'ip' => ['$exists' => true, '$nin' => [null, '']],
        ];

        if ($afterId !== null) {
            $filter['_id'] = ['$gt' => $afterId];
        }

        return $filter;
    }

    /**
     * @return array{'$unset': array{ip: string}}
     */
    public static function update(): array
    {
        return ['$unset' => ['ip' => '']];
    }

    public function findEligibleIds(int $cutoffMs, ObjectId|string|null $afterId, int $limit): array
    {
        $cursor = Collections::clicks()->find(self::filter($cutoffMs, $afterId), [
            'projection' => ['_id' => 1],
            'sort' => ['_id' => 1],
            'limit' => $limit,
            'typeMap' => ['root' => 'array'],
        ]);

        return array_map(fn (array $document): ObjectId|string => $document['_id'], $cursor->toArray());
    }

    public function unsetIpByIds(array $ids): int
    {
        if ($ids === []) {
            return 0;
        }

        return Collections::clicks()->updateMany(['_id' => ['$in' => $ids]], self::update())->getModifiedCount() ?? count($ids);
    }
}
