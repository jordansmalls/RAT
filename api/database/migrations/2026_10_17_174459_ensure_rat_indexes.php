<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        $indexes = [
            'users' => [
                [['email' => 1], ['unique' => true]],
                [['handle' => 1], ['unique' => true, 'sparse' => true]],
            ],
            'projects' => [[['owner' => 1], []]],
            'links' => [
                [['project' => 1], []], [['campaign' => 1], []], [['slug' => 1], ['unique' => true]],
            ],
            'clicks' => [],
            'personal_access_tokens' => [[['token' => 1], ['unique' => true]], [['tokenable_type' => 1, 'tokenable_id' => 1], []]],
        ];
        foreach (['link', 'campaign', 'project', 'clickedAt', 'dayOfWeek', 'hourOfDay', 'geo.country', 'device.type', 'os.name', 'browser.name', 'isBot'] as $field) {
            $indexes['clicks'][] = [[$field => 1], []];
        }
        foreach (['project', 'campaign', 'link'] as $field) {
            $indexes['clicks'][] = [[$field => 1, 'clickedAt' => -1], []];
        }
        $indexes['clicks'][] = [['project' => 1, 'visitorId' => 1], ['partialFilterExpression' => ['visitorId' => ['$exists' => true]]]];

        foreach ($indexes as $collection => $definitions) {
            $existing = iterator_to_array(DB::connection('mongodb')->getCollection($collection)->listIndexes());
            Schema::connection('mongodb')->table($collection, function (Blueprint $table) use ($definitions, $existing): void {
                foreach ($definitions as [$keys, $options]) {
                    foreach ($existing as $index) {
                        if ($index->getKey() === $keys) {
                            continue 2;
                        }
                    }
                    $table->index($keys, options: $options);
                }
            });
        }
    }

    public function down(): void
    {
        // These indexes may predate Laravel; rollback must preserve shared data and indexes.
    }
};
