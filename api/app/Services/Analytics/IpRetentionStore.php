<?php

namespace App\Services\Analytics;

use MongoDB\BSON\ObjectId;

/**
 * Storage used by {@see IpRetention}. The service only needs these two operations, so tests
 * can substitute an in-memory store.
 */
interface IpRetentionStore
{
    /**
     * IDs of clicks strictly older than the cutoff that still hold a non-empty IP, in ascending
     * `_id` order and after the cursor when one is given.
     *
     * @param  int  $cutoffMs  Unix milliseconds.
     * @return list<ObjectId|string>
     */
    public function findEligibleIds(int $cutoffMs, ObjectId|string|null $afterId, int $limit): array;

    /**
     * Unset `ip` on the given clicks and return how many were modified.
     *
     * @param  list<ObjectId|string>  $ids
     */
    public function unsetIpByIds(array $ids): int;
}
