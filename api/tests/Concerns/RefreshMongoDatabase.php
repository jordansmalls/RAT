<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\DB;
use RuntimeException;

trait RefreshMongoDatabase
{
    protected function setUpRefreshMongoDatabase(): void
    {
        if (config('database.connections.mongodb.dsn') !== 'mongodb://127.0.0.1:27017'
            || ! str_starts_with((string) config('database.connections.mongodb.database'), 'rat_api_testing')) {
            throw new RuntimeException('Tests must use an isolated local rat_api_testing* database.');
        }
        $database = DB::connection('mongodb')->getDatabase();
        foreach ($database->listCollectionNames() as $collection) {
            if ($collection !== 'migrations' && ! str_starts_with($collection, 'system.')) {
                $database->selectCollection($collection)->deleteMany([]);
            }
        }
        $this->artisan('migrate', ['--force' => true])->assertExitCode(0);
    }
}
