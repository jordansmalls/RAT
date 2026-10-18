<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Services\Analytics\ProjectMetrics;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Per-project analytics (port of the old `analytics.controller.js`).
 *
 * Every endpoint accepts an optional `?linkId=<id>` to scope to one link and returns
 * `{ data: <old body> }`. Metrics are lifetime and include bots unless stated otherwise.
 */
class ProjectAnalyticsController extends ProjectScopedController
{
    public function __construct(protected ProjectMetrics $metrics) {}

    /**
     * Human confidence percentage (0-100, one decimal).
     */
    public function humanConfidence(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Human confidence calculated', $this->metrics->humanConfidence($this->clickScope($request, $projectId)));
    }

    /**
     * Click counts per link platform.
     */
    public function clicksPerPlatform(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Clicks per platform retrieved', $this->metrics->clicksPerPlatform($this->clickScope($request, $projectId)));
    }

    /**
     * Top 50 countries by clicks.
     */
    public function globalReach(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Global reach retrieved', $this->metrics->globalReach($this->clickScope($request, $projectId)));
    }

    /**
     * Platform efficiency (deprecated IP intent plus per-platform cookie audience).
     */
    public function efficiency(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Platform efficiency retrieved', $this->metrics->efficiency($this->clickScope($request, $projectId)));
    }

    /**
     * Golden-hour heatmap by stored day of week and hour.
     */
    public function heatmap(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Heatmap retrieved', $this->metrics->heatmap($this->clickScope($request, $projectId)));
    }

    /**
     * Loyalty: deprecated IP measures plus repeat-audience measures.
     */
    public function loyalty(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Loyalty metrics retrieved', $this->metrics->loyalty($this->clickScope($request, $projectId)));
    }

    /**
     * Device type counts.
     */
    public function deviceBreakdown(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Device breakdown retrieved', $this->metrics->deviceBreakdown($this->clickScope($request, $projectId)));
    }

    /**
     * The 10 most recent clicks.
     */
    public function recentActivity(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Recent activity retrieved', $this->metrics->recentActivity($this->clickScope($request, $projectId)));
    }

    /**
     * Platform share of clicks.
     */
    public function platformDominance(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Platform dominance retrieved', $this->metrics->platformDominance($this->clickScope($request, $projectId)));
    }

    /**
     * Network effect (deprecated IP visitors plus cookie audience).
     */
    public function networkEffect(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Network effect retrieved', $this->metrics->networkEffect($this->clickScope($request, $projectId)));
    }

    /**
     * Rolling 30-day growth.
     */
    public function velocity(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Velocity retrieved', $this->metrics->velocity($this->clickScope($request, $projectId)));
    }

    /**
     * Campaign with the most clicks.
     */
    public function heroCampaign(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Hero campaign retrieved', $this->metrics->heroCampaign($this->clickScope($request, $projectId)));
    }

    /**
     * Network effect, dominance, velocity and hero campaign in one response.
     */
    public function monthlyHealth(Request $request, string $projectId): JsonResponse
    {
        return $this->respond('Monthly health retrieved', $this->metrics->monthlyHealth($this->clickScope($request, $projectId)));
    }
}
