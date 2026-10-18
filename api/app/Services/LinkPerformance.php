<?php

namespace App\Services;

use App\Http\Resources\RatResource;
use App\Models\Campaign;
use App\Models\Link;
use Illuminate\Support\Facades\DB;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class LinkPerformance
{
    public function summarize(Campaign $campaign, string $window): array
    {
        $hours = ['24h' => 24, '7d' => 168, '30d' => 720][$window];
        $end = now();
        $start = $end->subHours($hours);
        $bucketMs = $hours * 3600000 / 12;
        $links = Link::where('campaign', new ObjectId($campaign->id))->orderBy('createdAt')->get();
        $metrics = [];
        foreach ($links as $link) {
            $metrics[$link->id] = ['clicks' => 0, 'previousClicks' => 0, 'trend' => array_fill(0, 12, 0)];
        }
        $rows = DB::connection('mongodb')->getCollection('clicks')->aggregate([
            ['$match' => ['campaign' => new ObjectId($campaign->id), 'isBot' => ['$ne' => true], 'clickedAt' => ['$gte' => new UTCDateTime($end->subHours($hours * 2)), '$lt' => new UTCDateTime($end)]]],
            ['$group' => ['_id' => ['link' => '$link', 'bucket' => ['$floor' => ['$divide' => [['$subtract' => ['$clickedAt', new UTCDateTime($start)]], $bucketMs]]]], 'count' => ['$sum' => 1]]],
        ]);
        foreach ($rows as $row) {
            $id = (string) $row['_id']['link'];
            $bucket = (int) $row['_id']['bucket'];
            if (! isset($metrics[$id])) {
                continue;
            }
            if ($bucket >= 0 && $bucket < 12) {
                $metrics[$id]['clicks'] += $row['count'];
                $metrics[$id]['trend'][$bucket] += $row['count'];
            } elseif ($bucket >= -12 && $bucket < 0) {
                $metrics[$id]['previousClicks'] += $row['count'];
            }
        }
        $total = array_sum(array_column($metrics, 'clicks'));
        $peak = max([0, ...array_column($metrics, 'clicks')]);
        $result = [];
        foreach ($links as $link) {
            $metric = $metrics[$link->id];
            $result[] = [...RatResource::serialize($link), 'performance' => [
                ...$metric,
                'clicksPerHour' => $metric['clicks'] / $hours,
                'changePercent' => $metric['previousClicks'] > 0 ? ($metric['clicks'] - $metric['previousClicks']) / $metric['previousClicks'] * 100 : null,
                'sharePercent' => $total > 0 ? $metric['clicks'] / $total * 100 : 0,
                'velocityPercent' => $peak > 0 ? $metric['clicks'] / $peak * 100 : 0,
            ]];
        }

        return ['window' => $window, 'start' => $start, 'end' => $end, 'bucketMs' => $bucketMs, 'links' => $result];
    }
}
