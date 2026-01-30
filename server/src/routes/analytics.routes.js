import e from "express";
import {
    getHumanConfidence,
    downloadClicks,
    getClicksPerPlatform,
    getGlobalReach,
    getPlatformEfficiency,
    getGoldenHour,
    getLoyalty,
    getDeviceBreakdown,
    getRecentActivity,
    getPlatformDominance,
    getNetworkEffect,
    getVelocity,
    getHeroCampaign,
    getMonthlyHealth,
} from "../controllers/analytics.controller.js";

const router = e.Router();

// @desc    Get human confidence percentage
// @route   GET /api/analytics/project/:projectId/human-confidence
router.get("/project/:projectId/human-confidence", getHumanConfidence);

// @desc    Download clicks as JSON or CSV
// @route   GET /api/analytics/project/:projectId/export
router.get("/project/:projectId/export", downloadClicks);

// @desc    Get clicks per platform
// @route   GET /api/analytics/project/:projectId/clicks-per-platform
router.get("/project/:projectId/clicks-per-platform", getClicksPerPlatform);

// @desc    Get global reach by country
// @route   GET /api/analytics/project/:projectId/global-reach
router.get("/project/:projectId/global-reach", getGlobalReach);

// @desc    Get platform efficiency (intent ratio)
// @route   GET /api/analytics/project/:projectId/efficiency
router.get("/project/:projectId/efficiency", getPlatformEfficiency);

// @desc    Get golden hour heatmap
// @route   GET /api/analytics/project/:projectId/heatmap
router.get("/project/:projectId/heatmap", getGoldenHour);

// @desc    Get loyalty metrics
// @route   GET /api/analytics/project/:projectId/loyalty
router.get("/project/:projectId/loyalty", getLoyalty);

// @desc    Get device breakdown
// @route   GET /api/analytics/project/:projectId/device-breakdown
router.get("/project/:projectId/device-breakdown", getDeviceBreakdown);

// @desc    Get recent activity
// @route   GET /api/analytics/project/:projectId/recent-activity
router.get("/project/:projectId/recent-activity", getRecentActivity);

// @desc    Get platform dominance
// @route   GET /api/analytics/project/:projectId/platform-dominance
router.get("/project/:projectId/platform-dominance", getPlatformDominance);

// @desc    Get network effect
// @route   GET /api/analytics/project/:projectId/network-effect
router.get("/project/:projectId/network-effect", getNetworkEffect);

// @desc    Get velocity (growth rate)
// @route   GET /api/analytics/project/:projectId/velocity
router.get("/project/:projectId/velocity", getVelocity);

// @desc    Get hero campaign
// @route   GET /api/analytics/project/:projectId/hero-campaign
router.get("/project/:projectId/hero-campaign", getHeroCampaign);

// @desc    Get monthly health
// @route   GET /api/analytics/project/:projectId/monthly-health
router.get("/project/:projectId/monthly-health", getMonthlyHealth);

export default router;
