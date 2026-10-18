<?php

use App\Http\Controllers\Api\V1\Analytics\ClickExportController;
use App\Http\Controllers\Api\V1\Analytics\DealValueController;
use App\Http\Controllers\Api\V1\Analytics\DecayCurveController;
use App\Http\Controllers\Api\V1\Analytics\GeoValueController;
use App\Http\Controllers\Api\V1\Analytics\OverviewController;
use App\Http\Controllers\Api\V1\Analytics\ProjectAnalyticsController;
use App\Http\Controllers\Api\V1\Analytics\TrafficQualityController;
use Illuminate\Support\Facades\Route;

/*
| Analytics routes. Loaded inside the `v1`, `auth:sanctum` and `onboarded`
| groups in routes/api.php, so paths here are relative to /api/v1.
|
| The project segment is named `projectId` (not `project`) so no route-model
| binding applies: ownership and the old 400/404 messages are handled by
| App\Services\Analytics\ProjectAccess.
*/

Route::prefix('analytics')->name('analytics.')->group(function () {
    Route::get('overview', OverviewController::class)->name('overview');

    Route::prefix('project/{projectId}')->name('project.')->group(function () {
        Route::get('export', ClickExportController::class)->name('export');
        Route::get('geo-value', GeoValueController::class)->name('geo-value');
        Route::get('decay', DecayCurveController::class)->name('decay');
        Route::get('traffic-quality', TrafficQualityController::class)->name('traffic-quality');

        Route::controller(ProjectAnalyticsController::class)->group(function () {
            Route::get('human-confidence', 'humanConfidence')->name('human-confidence');
            Route::get('clicks-per-platform', 'clicksPerPlatform')->name('clicks-per-platform');
            Route::get('global-reach', 'globalReach')->name('global-reach');
            Route::get('efficiency', 'efficiency')->name('efficiency');
            Route::get('heatmap', 'heatmap')->name('heatmap');
            Route::get('loyalty', 'loyalty')->name('loyalty');
            Route::get('device-breakdown', 'deviceBreakdown')->name('device-breakdown');
            Route::get('recent-activity', 'recentActivity')->name('recent-activity');
            Route::get('platform-dominance', 'platformDominance')->name('platform-dominance');
            Route::get('network-effect', 'networkEffect')->name('network-effect');
            Route::get('velocity', 'velocity')->name('velocity');
            Route::get('hero-campaign', 'heroCampaign')->name('hero-campaign');
            Route::get('monthly-health', 'monthlyHealth')->name('monthly-health');
        });
    });

    Route::get('campaign/{campaignId}/deal-value', DealValueController::class)->name('campaign.deal-value');
});
