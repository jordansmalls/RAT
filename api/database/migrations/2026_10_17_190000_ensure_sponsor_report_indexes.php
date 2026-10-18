<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use MongoDB\Laravel\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        $definitions = [
            [['tokenHash' => 1], ['unique' => true]],
            [['owner' => 1, 'createdAt' => -1], []],
            [['campaign' => 1], []],
        ];
        $existing = iterator_to_array(DB::connection('mongodb')->getCollection('sponsor_reports')->listIndexes());

        Schema::connection('mongodb')->table('sponsor_reports', function (Blueprint $table) use ($definitions, $existing): void {
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

    public function down(): void
    {
        Schema::connection('mongodb')->table('sponsor_reports', function (Blueprint $table): void {
            foreach (['tokenHash_1', 'owner_1_createdAt_-1', 'campaign_1'] as $name) {
                $table->dropIndexIfExists($name);
            }
        });
    }
};
